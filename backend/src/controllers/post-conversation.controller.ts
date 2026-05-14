import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { aiService } from "../services/ai.service";
import {
  ReminderType,
  ActionItemStatus,
  ReminderStatus,
} from "@prisma/client";

// Validation schemas
const endConversationSchema = z.object({
  conversationId: z.string(),
});

const actionItemStatusSchema = z.object({
  conversationId: z.string(),
  actionItemId: z.string(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"]),
});

const reflectionResponseSchema = z.object({
  conversationId: z.string(),
  promptId: z.string(),
  response: z.string().max(2000),
});

function getSingleParam(param: string | string[] | undefined): string | null {
  if (typeof param === "string" && param.trim().length > 0) {
    return param;
  }

  return null;
}

/**
 * End conversation and generate post-conversation analysis
 * POST /api/post-conversation/end-conversation
 */
export async function endConversation(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const parsed = endConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const userId = req.auth!.sub;
    const { conversationId } = parsed.data;

    // Fetch conversation with all messages
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: true },
        },
        match: {
          include: {
            seeker: {
              include: {
                userLifeEvents: {
                  include: {
                    lifeEvent: true,
                  },
                },
              },
            },
            mentor: {
              include: {
                mentorProfile: true,
                userLifeEvents: {
                  include: {
                    lifeEvent: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Verify user is part of this conversation
    if (
      conversation.match.seekerId !== userId &&
      conversation.match.mentorId !== userId
    ) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    // Convert messages to conversation history format
    const conversationHistory = conversation.messages.map((msg) => ({
      sender: msg.sender.name,
      content: msg.content,
    }));

    // Get life event
    const lifeEvent = conversation.match.seekerId === userId
      ? conversation.match.seeker.userLifeEvents[0]?.lifeEvent?.label || "Life Event"
      : conversation.match.mentor.userLifeEvents[0]?.lifeEvent?.label || "Life Event";

    // Generate summary
    const summaryResult = await aiService.generateConversationSummary({
      conversationHistory,
      seekerName: conversation.match.seeker.name,
      seekerRole: "SEEKER",
      mentorName: conversation.match.mentor.name,
      mentorRole: "MENTOR",
      lifeEvent,
    });

    // Generate action plan
    const actionPlanResult = await aiService.generateActionPlan({
      conversationHistory,
      seekerName: conversation.match.seeker.name,
      seekerRole: "SEEKER",
      mentorName: conversation.match.mentor.name,
      mentorRole: "MENTOR",
      lifeEvent,
    });

    // Generate reflection prompts
    const reflectionResult = await aiService.generateReflectionPrompts({
      conversationHistory,
      seekerName: conversation.match.seeker.name,
      seekerRole: "SEEKER",
      mentorName: conversation.match.mentor.name,
      mentorRole: "MENTOR",
      lifeEvent,
    });

    // Create database records
    const summary = await prisma.conversationSummary.create({
      data: {
        conversationId,
        summaryForSeeker: summaryResult.summaryForSeeker,
        summaryForMentor: summaryResult.summaryForMentor,
        keyThemes: summaryResult.keyThemes,
        emotionalTone: summaryResult.emotionalTone,
      },
    });

    // Create action items
    const actionItems = await Promise.all(
      actionPlanResult.actionItems.map((item) =>
        prisma.actionItem.create({
          data: {
            conversationId,
            title: item.title,
            description: item.description,
            assignedTo:
              item.assignedTo === "MENTOR"
                ? conversation.match.mentorId
                : conversation.match.seekerId,
            priority: item.priority,
            dueDate: item.dueDate
              ? new Date(Date.now() + parseDueDate(item.dueDate))
              : undefined,
          },
        })
      )
    );

    // Create reflection prompts
    const reflectionPrompts = await Promise.all([
      ...reflectionResult.seekerPrompts.map((prompt) =>
        prisma.reflectionPrompt.create({
          data: {
            conversationId,
            forRole: "SEEKER",
            prompt,
            category: "growth",
          },
        })
      ),
      ...reflectionResult.mentorPrompts.map((prompt) =>
        prisma.reflectionPrompt.create({
          data: {
            conversationId,
            forRole: "MENTOR",
            prompt,
            category: "mentorship",
          },
        })
      ),
    ]);

    // Schedule check-in reminders
    await scheduleCheckInReminders(conversation, conversationId);

    // Create progress snapshot
    await createProgressSnapshot(
      conversation,
      conversationId,
      actionItems.length
    );

    res.json({
      summary,
      actionItems,
      reflectionPrompts,
      message: "Post-conversation analysis completed",
    });
  } catch (error) {
    console.error("Error ending conversation:", error);
    res.status(500).json({ error: "Failed to process post-conversation" });
  }
}

/**
 * Get conversation summary
 * GET /api/post-conversation/:conversationId/summary
 */
export async function getConversationSummary(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const conversationId = getSingleParam(req.params.conversationId);
    if (!conversationId) {
      res.status(400).json({ error: "Invalid conversation id" });
      return;
    }

    const userId = req.auth!.sub;

    // Verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        match: true,
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (
      conversation.match.seekerId !== userId &&
      conversation.match.mentorId !== userId
    ) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const summary = await prisma.conversationSummary.findUnique({
      where: { conversationId },
    });

    if (!summary) {
      res.status(404).json({ error: "Summary not found" });
      return;
    }

    // Determine which summary to show based on user role
    const userRole =
      conversation.match.seekerId === userId ? "SEEKER" : "MENTOR";
    const summaryText =
      userRole === "SEEKER"
        ? summary.summaryForSeeker
        : summary.summaryForMentor;

    res.json({
      ...summary,
      personalSummary: summaryText,
    });
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
}

/**
 * Get action plan items
 * GET /api/post-conversation/:conversationId/action-plan
 */
export async function getActionPlan(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const conversationId = getSingleParam(req.params.conversationId);
    if (!conversationId) {
      res.status(400).json({ error: "Invalid conversation id" });
      return;
    }

    const userId = req.auth!.sub;

    // Verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        match: true,
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (
      conversation.match.seekerId !== userId &&
      conversation.match.mentorId !== userId
    ) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const actionItems = await prisma.actionItem.findMany({
      where: { conversationId },
      orderBy: { priority: "asc" },
      include: {
        conversation: {
          include: {
            match: true,
          },
        },
      },
    });

    // Add metadata about who should see this item
    const enrichedItems = actionItems.map((item) => ({
      ...item,
      isMyAction: item.assignedTo === userId,
      assigneeRole:
        item.assignedTo === conversation.match.seekerId
          ? "SEEKER"
          : "MENTOR",
    }));

    res.json(enrichedItems);
  } catch (error) {
    console.error("Error fetching action plan:", error);
    res.status(500).json({ error: "Failed to fetch action plan" });
  }
}

/**
 * Update action item status
 * PUT /api/post-conversation/:conversationId/action-item/:actionItemId/status
 */
export async function updateActionItemStatus(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const parsed = actionItemStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const userId = req.auth!.sub;
    const { conversationId, actionItemId, status } = parsed.data;

    // Verify access and ownership
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { match: true },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (
      conversation.match.seekerId !== userId &&
      conversation.match.mentorId !== userId
    ) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const actionItem = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
    });

    if (!actionItem || actionItem.conversationId !== conversationId) {
      res.status(404).json({ error: "Action item not found" });
      return;
    }

    if (actionItem.assignedTo !== userId) {
      res
        .status(403)
        .json({ error: "You can only update your assigned items" });
      return;
    }

    const updated = await prisma.actionItem.update({
      where: { id: actionItemId },
      data: {
        status: status as ActionItemStatus,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating action item:", error);
    res.status(500).json({ error: "Failed to update action item" });
  }
}

/**
 * Get reflection prompts
 * GET /api/post-conversation/:conversationId/reflection-prompts
 */
export async function getReflectionPrompts(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const conversationId = getSingleParam(req.params.conversationId);
    if (!conversationId) {
      res.status(400).json({ error: "Invalid conversation id" });
      return;
    }

    const userId = req.auth!.sub;

    // Verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { match: true },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (
      conversation.match.seekerId !== userId &&
      conversation.match.mentorId !== userId
    ) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    // Determine user role
    const userRole =
      conversation.match.seekerId === userId ? "SEEKER" : "MENTOR";

    const prompts = await prisma.reflectionPrompt.findMany({
      where: {
        conversationId,
        forRole: userRole,
      },
    });

    res.json(prompts);
  } catch (error) {
    console.error("Error fetching reflection prompts:", error);
    res.status(500).json({ error: "Failed to fetch reflection prompts" });
  }
}

/**
 * Submit reflection response
 * POST /api/post-conversation/:conversationId/reflection-response
 */
export async function submitReflectionResponse(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const parsed = reflectionResponseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const userId = req.auth!.sub;
    const { conversationId, promptId, response } = parsed.data;

    // Verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { match: true },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (
      conversation.match.seekerId !== userId &&
      conversation.match.mentorId !== userId
    ) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const prompt = await prisma.reflectionPrompt.findUnique({
      where: { id: promptId },
    });

    if (!prompt || prompt.conversationId !== conversationId) {
      res.status(404).json({ error: "Prompt not found" });
      return;
    }

    const updated = await prisma.reflectionPrompt.update({
      where: { id: promptId },
      data: {
        response,
        respondedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error submitting reflection response:", error);
    res.status(500).json({ error: "Failed to submit reflection" });
  }
}

/**
 * Get progress snapshot
 * GET /api/post-conversation/:conversationId/progress-snapshot
 */
export async function getProgressSnapshot(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const conversationId = getSingleParam(req.params.conversationId);
    if (!conversationId) {
      res.status(400).json({ error: "Invalid conversation id" });
      return;
    }

    const userId = req.auth!.sub;

    // Verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { match: true },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (
      conversation.match.seekerId !== userId &&
      conversation.match.mentorId !== userId
    ) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const snapshot = await prisma.progressSnapshot.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!snapshot) {
      res.status(404).json({ error: "Progress snapshot not found" });
      return;
    }

    res.json(snapshot);
  } catch (error) {
    console.error("Error fetching progress snapshot:", error);
    res.status(500).json({ error: "Failed to fetch progress snapshot" });
  }
}

/**
 * Get check-in reminders
 * GET /api/post-conversation/:conversationId/reminders
 */
export async function getCheckInReminders(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const conversationId = getSingleParam(req.params.conversationId);
    if (!conversationId) {
      res.status(400).json({ error: "Invalid conversation id" });
      return;
    }

    const userId = req.auth!.sub;

    // Verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { match: true },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (
      conversation.match.seekerId !== userId &&
      conversation.match.mentorId !== userId
    ) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const reminders = await prisma.checkInReminder.findMany({
      where: {
        conversationId,
        recipientId: userId,
      },
      orderBy: { scheduledFor: "asc" },
    });

    res.json(reminders);
  } catch (error) {
    console.error("Error fetching check-in reminders:", error);
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
}

// ─────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────

/**
 * Parse due date string to milliseconds
 */
function parseDueDate(dateStr: string): number {
  const parts = dateStr.toLowerCase().split(" ");
  const number = parseInt(parts[0], 10);

  if (parts[1]?.includes("day")) {
    return number * 24 * 60 * 60 * 1000;
  } else if (parts[1]?.includes("week")) {
    return number * 7 * 24 * 60 * 60 * 1000;
  } else if (parts[1]?.includes("month")) {
    return number * 30 * 24 * 60 * 60 * 1000;
  }

  return 24 * 60 * 60 * 1000; // Default to 1 day
}

/**
 * Schedule check-in reminders for the conversation
 */
async function scheduleCheckInReminders(
  conversation: any,
  conversationId: string
) {
  const reminders = [
    {
      type: ReminderType.CHECK_IN_3_DAYS,
      daysOffset: 3,
      messageSuffix: "How are your action items progressing?",
    },
    {
      type: ReminderType.CHECK_IN_1_WEEK,
      daysOffset: 7,
      messageSuffix: "Check in on your week of progress!",
    },
    {
      type: ReminderType.CHECK_IN_2_WEEKS,
      daysOffset: 14,
      messageSuffix: "2 weeks later - how far have you come?",
    },
  ];

  const now = new Date();

  await Promise.all(
    reminders.flatMap((reminder) => [
      // Reminder for seeker
      prisma.checkInReminder.create({
        data: {
          conversationId,
          reminderType: reminder.type,
          scheduledFor: new Date(now.getTime() + reminder.daysOffset * 24 * 60 * 60 * 1000),
          status: ReminderStatus.SCHEDULED,
          message: `Hi ${conversation.match.seeker.name}! ${reminder.messageSuffix}`,
          recipientId: conversation.match.seekerId,
        },
      }),
      // Reminder for mentor
      prisma.checkInReminder.create({
        data: {
          conversationId,
          reminderType: reminder.type,
          scheduledFor: new Date(now.getTime() + reminder.daysOffset * 24 * 60 * 60 * 1000),
          status: ReminderStatus.SCHEDULED,
          message: `Hi ${conversation.match.mentor.name}! Check in on ${conversation.match.seeker.name}'s progress.`,
          recipientId: conversation.match.mentorId,
        },
      }),
    ])
  );
}

/**
 * Create progress snapshot for tracking progress over time
 */
async function createProgressSnapshot(
  conversation: any,
  conversationId: string,
  actionItemCount: number
) {
  // Get previous snapshots to calculate engagement score
  const previousSnapshots = await prisma.progressSnapshot.findMany({
    where: {
      userId: conversation.match.seekerId,
    },
  });

  const engagementScore = Math.min(100, 50 + previousSnapshots.length * 10);

  await Promise.all([
    // Seeker snapshot
    prisma.progressSnapshot.create({
      data: {
        conversationId,
        userId: conversation.match.seekerId,
        conversationCount: previousSnapshots.filter(
          (s) => s.userId === conversation.match.seekerId
        ).length + 1,
        totalActionItems: actionItemCount,
        completedActions: 0,
        engagementScore,
        progressNotes: "Engaged in meaningful mentorship conversation",
      },
    }),
    // Mentor snapshot
    prisma.progressSnapshot.create({
      data: {
        conversationId,
        userId: conversation.match.mentorId,
        conversationCount: previousSnapshots.filter(
          (s) => s.userId === conversation.match.mentorId
        ).length + 1,
        totalActionItems: actionItemCount,
        completedActions: 0,
        engagementScore,
        progressNotes: "Provided mentorship and support",
      },
    }),
  ]);
}
