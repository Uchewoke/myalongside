import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { aiService } from "../services/ai.service";

// Validation schemas
const introSuggestionSchema = z.object({
  mentorId: z.string(),
  initialMessage: z.string().min(1).max(500),
});

const responseSuggestionSchema = z.object({
  conversationId: z.string(),
  messageContent: z.string().min(1).max(4000),
});

const conversationStartersSchema = z.object({
  lifeEventId: z.string(),
});

const safetyIntelligenceSchema = z.object({
  mode: z.enum(["conversation", "report", "mentor"]),
  content: z.string().min(1).max(8000),
  subject: z.string().max(200).optional(),
  reporterName: z.string().max(200).optional(),
  reportedName: z.string().max(200).optional(),
  mentorName: z.string().max(200).optional(),
  seekerName: z.string().max(200).optional(),
  conversationHistory: z.array(z.string().max(1000)).max(20).optional(),
  extraContext: z.array(z.string().max(1000)).max(20).optional(),
});

// New Mentor Copilot validation schemas
const empathyDraftingSchema = z.object({
  conversationId: z.string(),
  messageContent: z.string().min(1).max(4000),
});

const followUpQuestionsSchema = z.object({
  conversationId: z.string(),
  messageContent: z.string().min(1).max(4000),
});

const resourceRecommendationsSchema = z.object({
  conversationId: z.string(),
  lifeEvent: z.string(),
  discussionTopics: z.array(z.string()).max(5),
  seekerChallenges: z.array(z.string()).max(5),
});

const boundaryLanguageCheckSchema = z.object({
  conversationId: z.string(),
  draftMessage: z.string().min(1).max(4000),
});

/**
 * Generate intro message suggestions for seekers
 * POST /api/ai/suggestions/intro
 */
export async function generateIntroSuggestion(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const parsed = introSuggestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const userId = req.auth!.sub;
    const { mentorId, initialMessage } = parsed.data;

    // Fetch seeker and mentor profiles
    const [seeker, mentor] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          userLifeEvents: {
            include: { lifeEvent: true },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: mentorId },
        include: {
          mentorProfile: true,
          userLifeEvents: {
            include: { lifeEvent: true },
          },
        },
      }),
    ]);

    if (!seeker || !mentor || !mentor.mentorProfile) {
      res.status(404).json({ error: "User or mentor not found" });
      return;
    }

    // Generate suggestions
    const suggestions = await aiService.generateIntroSuggestion({
      seekerName: seeker.name,
      seekerBio: seeker.bio || undefined,
      seekerEvents: seeker.userLifeEvents.map((e: any) => e.lifeEvent.label),
      mentorName: mentor.name,
      mentorTagline: mentor.mentorProfile.tagline,
      mentorYearsExperience: mentor.mentorProfile.yearsExperience,
      seekerMessage: initialMessage,
    });

    res.json({ suggestions });
  } catch (error) {
    console.error("Error generating intro suggestion:", error);
    res.status(500).json({ error: "Failed to generate suggestion" });
  }
}

/**
 * Generate response suggestions for mentors
 * POST /api/ai/suggestions/response
 */
export async function generateResponseSuggestion(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const parsed = responseSuggestionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const userId = req.auth!.sub;
    const { conversationId, messageContent } = parsed.data;

    // Fetch conversation with full context
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        match: {
          include: {
            seeker: {
              include: {
                userLifeEvents: {
                  include: { lifeEvent: true },
                },
              },
            },
            mentor: {
              include: {
                mentorProfile: true,
                userLifeEvents: {
                  include: { lifeEvent: true },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 10,
          select: {
            content: true,
            senderId: true,
          },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Verify mentor is the current user
    if (conversation.match.mentorId !== userId) {
      res.status(403).json({ error: "Only mentor can get response suggestions" });
      return;
    }

    const mentor = conversation.match.mentor;
    const seeker = conversation.match.seeker;

    if (!mentor.mentorProfile) {
      res.status(400).json({ error: "Mentor profile incomplete" });
      return;
    }

    // Build conversation history
    const conversationHistory = conversation.messages
      .map(
        (msg: any) =>
          `${msg.senderId === seeker.id ? "Seeker" : "Mentor"}: ${msg.content}`
      )
      .slice(-5); // Last 5 messages for context

    // Generate suggestions
    const suggestions = await aiService.generateResponseSuggestion({
      seekerName: seeker.name,
      seekerBio: seeker.bio || undefined,
      seekerEvents: seeker.userLifeEvents.map((e: any) => e.lifeEvent.label),
      mentorName: mentor.name,
      mentorTagline: mentor.mentorProfile.tagline,
      mentorYearsExperience: mentor.mentorProfile.yearsExperience,
      seekerMessage: messageContent,
      conversationHistory,
    });

    res.json({ suggestions });
  } catch (error) {
    console.error("Error generating response suggestion:", error);
    res.status(500).json({ error: "Failed to generate suggestion" });
  }
}

/**
 * Get conversation starter suggestions for a life event
 * GET /api/ai/suggestions/starters?lifeEventId=xxx
 */
export async function getConversationStarters(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const parsed = conversationStartersSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { lifeEventId } = parsed.data;

    // Fetch life event
    const lifeEvent = await prisma.lifeEvent.findUnique({
      where: { id: lifeEventId },
    });

    if (!lifeEvent) {
      res.status(404).json({ error: "Life event not found" });
      return;
    }

    // Generate suggestions
    const suggestions = await aiService.generateConversationStarters({
      lifeEvents: [lifeEvent.label],
      eventDescription: lifeEvent.description,
    });

    res.json({ suggestions });
  } catch (error) {
    console.error("Error generating conversation starters:", error);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
}

/**
 * Generate AI safety intelligence for a conversation, report, or mentor guidance.
 * POST /api/ai/safety/intelligence
 */
export async function generateSafetyIntelligence(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const parsed = safetyIntelligenceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const result = await aiService.generateSafetyIntelligence(parsed.data);

    res.json(result);
  } catch (error) {
    console.error("Error generating safety intelligence:", error);
    res.status(500).json({ error: "Failed to generate safety intelligence" });
  }
}

/**
 * Track that a suggestion was used
 * POST /api/ai/suggestions/:suggestionId/accept
 */
export async function acceptSuggestion(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.auth!.sub;
    const suggestionId = Array.isArray(req.params.suggestionId)
      ? req.params.suggestionId[0]
      : req.params.suggestionId;

    if (!suggestionId) {
      res.status(400).json({ error: "Suggestion id is required" });
      return;
    }

    const suggestion = await prisma.aiSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        conversation: {
          include: {
            match: {
              select: {
                seekerId: true,
                mentorId: true,
              },
            },
          },
        },
      },
    });

    if (!suggestion) {
      res.status(404).json({ error: "Suggestion not found" });
      return;
    }

    const { seekerId, mentorId } = suggestion.conversation.match;
    if (userId !== seekerId && userId !== mentorId) {
      res.status(403).json({ error: "Not authorized to access this suggestion" });
      return;
    }

    // Update suggestion as used
    const updated = await prisma.aiSuggestion.update({
      where: { id: suggestionId },
      data: {
        accepted: true,
        usedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error accepting suggestion:", error);
    res.status(500).json({ error: "Failed to accept suggestion" });
  }
}

/**
 * Generate empathy-focused response drafts for mentors
 * POST /api/ai/mentor-copilot/empathy-drafting
 */
export async function generateEmpathyDrafting(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const parsed = empathyDraftingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const userId = req.auth!.sub;
    const { conversationId, messageContent } = parsed.data;

    // Fetch conversation with context
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        match: {
          include: {
            seeker: {
              include: {
                userLifeEvents: {
                  include: { lifeEvent: true },
                },
              },
            },
            mentor: {
              include: {
                mentorProfile: true,
                userLifeEvents: {
                  include: { lifeEvent: true },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 10,
          select: { content: true, senderId: true },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Verify mentor is current user
    if (conversation.match.mentorId !== userId) {
      res.status(403).json({ error: "Only mentor can get empathy drafting" });
      return;
    }

    const mentor = conversation.match.mentor;
    const seeker = conversation.match.seeker;

    if (!mentor.mentorProfile) {
      res.status(400).json({ error: "Mentor profile incomplete" });
      return;
    }

    const conversationHistory = conversation.messages
      .map((msg: any) => `${msg.senderId === seeker.id ? "Seeker" : "Mentor"}: ${msg.content}`)
      .slice(-5);

    // Generate empathy drafts
    const result = await aiService.generateEmpathyDrafting({
      seekerName: seeker.name,
      seekerBio: seeker.bio || undefined,
      seekerEvents: seeker.userLifeEvents.map((e: any) => e.lifeEvent.label),
      mentorName: mentor.name,
      mentorTagline: mentor.mentorProfile.tagline,
      mentorYearsExperience: mentor.mentorProfile.yearsExperience,
      seekerMessage: messageContent,
      conversationHistory,
    });

    res.json(result);
  } catch (error) {
    console.error("Error generating empathy drafting:", error);
    res.status(500).json({ error: "Failed to generate empathy drafting" });
  }
}

/**
 * Generate contextual follow-up questions for mentors
 * POST /api/ai/mentor-copilot/follow-up-questions
 */
export async function generateFollowUpQuestions(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const parsed = followUpQuestionsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const userId = req.auth!.sub;
    const { conversationId, messageContent } = parsed.data;

    // Fetch conversation with context
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        match: {
          include: {
            seeker: {
              include: {
                userLifeEvents: {
                  include: { lifeEvent: true },
                },
              },
            },
            mentor: {
              include: {
                mentorProfile: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 20,
          select: { content: true, senderId: true },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Verify mentor is current user
    if (conversation.match.mentorId !== userId) {
      res.status(403).json({ error: "Only mentor can get follow-up questions" });
      return;
    }

    const mentor = conversation.match.mentor;
    const seeker = conversation.match.seeker;

    if (!mentor.mentorProfile) {
      res.status(400).json({ error: "Mentor profile incomplete" });
      return;
    }

    // Get last mentor message
    const lastMentorMsg = [...conversation.messages]
      .reverse()
      .find((msg) => msg.senderId === mentor.id);

    // Generate follow-up questions
    const result = await aiService.generateFollowUpQuestions({
      seekerName: seeker.name,
      seekerBio: seeker.bio || undefined,
      seekerEvents: seeker.userLifeEvents.map((e: any) => e.lifeEvent.label),
      mentorName: mentor.name,
      mentorTagline: mentor.mentorProfile.tagline,
      mentorYearsExperience: mentor.mentorProfile.yearsExperience,
      seekerMessage: messageContent,
      lastMentorMessage: lastMentorMsg?.content,
    });

    res.json(result);
  } catch (error) {
    console.error("Error generating follow-up questions:", error);
    res.status(500).json({ error: "Failed to generate follow-up questions" });
  }
}

/**
 * Generate resource recommendations based on conversation
 * POST /api/ai/mentor-copilot/resource-recommendations
 */
export async function generateResourceRecommendations(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const parsed = resourceRecommendationsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const userId = req.auth!.sub;
    const { conversationId, lifeEvent, discussionTopics, seekerChallenges } = parsed.data;

    // Verify mentor
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        match: {
          include: {
            mentor: {
              include: { mentorProfile: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (conversation.match.mentorId !== userId) {
      res.status(403).json({ error: "Only mentor can get resource recommendations" });
      return;
    }

    const mentor = conversation.match.mentor;
    if (!mentor.mentorProfile) {
      res.status(400).json({ error: "Mentor profile incomplete" });
      return;
    }

    // Generate resources
    const result = await aiService.generateResourceRecommendations({
      lifeEvent,
      conversationTopics: discussionTopics,
      mentorExpertise: mentor.mentorProfile.tagline,
      seekerChallenges,
    });

    res.json(result);
  } catch (error) {
    console.error("Error generating resource recommendations:", error);
    res.status(500).json({ error: "Failed to generate resource recommendations" });
  }
}

/**
 * Check draft message for boundary-safe language
 * POST /api/ai/mentor-copilot/boundary-check
 */
export async function checkBoundaryLanguage(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const parsed = boundaryLanguageCheckSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const userId = req.auth!.sub;
    const { conversationId, draftMessage } = parsed.data;

    // Fetch conversation with context
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
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
            mentor: true,
          },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Verify mentor is current user
    if (conversation.match.mentorId !== userId) {
      res.status(403).json({ error: "Only mentor can check boundary language" });
      return;
    }

    // Check boundaries
    const result = await aiService.checkBoundaryLanguage({
      draftMessage,
      mentorName: conversation.match.mentor.name,
      seekerName: conversation.match.seeker.name,
      lifeEvent:
        conversation.match.seeker.userLifeEvents[0]?.lifeEvent?.label ||
        "mentorship",
    });

    res.json(result);
  } catch (error) {
    console.error("Error checking boundary language:", error);
    res.status(500).json({ error: "Failed to check boundary language" });
  }
}
