import { prisma } from "../lib/prisma";
import { ReminderStatus } from "@prisma/client";

/**
 * Reminder Service - Manages check-in reminders for post-conversation follow-ups
 * This service should be called by a scheduled job (cron) or message queue
 */
export class ReminderService {
  /**
   * Process due reminders - sends them and updates status
   * This should be run periodically (e.g., every 15 minutes) via a cron job
   */
  static async processDueReminders(): Promise<number> {
    const now = new Date();

    // Find all reminders that are scheduled and due
    const dueReminders = await prisma.checkInReminder.findMany({
      where: {
        status: ReminderStatus.SCHEDULED,
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        conversation: {
          include: {
            match: {
              include: {
                seeker: true,
                mentor: true,
              },
            },
          },
        },
        recipient: true,
      },
    });

    let sentCount = 0;

    for (const reminder of dueReminders) {
      try {
        // Send reminder via email or notification (implementation depends on your notification service)
        await this.sendReminder(reminder);

        // Update reminder status to sent
        await prisma.checkInReminder.update({
          where: { id: reminder.id },
          data: {
            status: ReminderStatus.SENT,
            sentAt: now,
          },
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send reminder ${reminder.id}:`, error);
        // Continue processing other reminders even if one fails
      }
    }

    console.log(`Processed ${sentCount} reminders`);
    return sentCount;
  }

  /**
   * Send a reminder notification
   * This is a placeholder - implement with your actual notification service
   * (e.g., email, SMS, push notifications, etc.)
   */
  private static async sendReminder(reminder: any): Promise<void> {
    console.log(
      `Sending reminder to ${reminder.recipient.email}: ${reminder.message}`
    );

    // Example: Send email notification
    // await emailService.send({
    //   to: reminder.recipient.email,
    //   subject: "Time to check in on your progress",
    //   template: "check-in-reminder",
    //   data: {
    //     recipientName: reminder.recipient.name,
    //     message: reminder.message,
    //     conversationLink: `${process.env.WEB_URL}/chat/${reminder.conversation.id}`,
    //     actionPlanLink: `${process.env.WEB_URL}/progress/${reminder.conversation.id}`,
    //   },
    // });

    // Example: Send push notification if user has Firebase tokens
    // await notificationService.sendPushNotification({
    //   userId: reminder.recipientId,
    //   title: "Check in on your mentorship",
    //   body: reminder.message,
    //   data: {
    //     type: "check-in-reminder",
    //     conversationId: reminder.conversationId,
    //   },
    // });
  }

  /**
   * Get pending reminders for a user
   */
  static async getPendingReminders(userId: string): Promise<any[]> {
    const now = new Date();

    return prisma.checkInReminder.findMany({
      where: {
        recipientId: userId,
        status: ReminderStatus.SCHEDULED,
        scheduledFor: {
          lte: now,
        },
      },
      orderBy: { scheduledFor: "asc" },
      include: {
        conversation: {
          include: {
            match: {
              include: {
                seeker: true,
                mentor: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Mark a reminder as completed
   */
  static async completeReminder(reminderId: string): Promise<void> {
    await prisma.checkInReminder.update({
      where: { id: reminderId },
      data: {
        status: ReminderStatus.COMPLETED,
      },
    });
  }

  /**
   * Snooze a reminder - reschedule it for later
   */
  static async snoozeReminder(reminderId: string, hoursFromNow: number): Promise<void> {
    const newDate = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

    await prisma.checkInReminder.update({
      where: { id: reminderId },
      data: {
        scheduledFor: newDate,
      },
    });
  }

  /**
   * Dismiss a reminder permanently
   */
  static async dismissReminder(reminderId: string): Promise<void> {
    await prisma.checkInReminder.update({
      where: { id: reminderId },
      data: {
        status: ReminderStatus.SKIPPED,
      },
    });
  }

  /**
   * Get reminder statistics for a user
   */
  static async getReminderStats(userId: string): Promise<{
    total: number;
    pending: number;
    sent: number;
    completed: number;
  }> {
    const [total, pending, sent, completed] = await Promise.all([
      prisma.checkInReminder.count({
        where: { recipientId: userId },
      }),
      prisma.checkInReminder.count({
        where: { recipientId: userId, status: ReminderStatus.SCHEDULED },
      }),
      prisma.checkInReminder.count({
        where: { recipientId: userId, status: ReminderStatus.SENT },
      }),
      prisma.checkInReminder.count({
        where: { recipientId: userId, status: ReminderStatus.COMPLETED },
      }),
    ]);

    return { total, pending, sent, completed };
  }
}

/**
 * CRON JOB SETUP INSTRUCTIONS
 * 
 * To enable automatic reminder sending, you need to set up a cron job
 * that calls ReminderService.processDueReminders() periodically.
 * 
 * Option 1: Using node-cron (in-process)
 * Install: npm install node-cron
 * Add to src/index.ts:
 * 
 *   import cron from "node-cron";
 *   import { ReminderService } from "./services/reminder.service";
 *   
 *   // Run every 15 minutes
 *   cron.schedule("0 * /15 * * * *", async () => {
 *     try {
 *       await ReminderService.processDueReminders();
 *     } catch (error) {
 *       console.error("Cron job failed:", error);
 *     }
 *   });
 * 
 * Option 2: Using external service (recommended for production)
 * - Set up a separate cron service or use a service like:
 *   - AWS EventBridge + Lambda
 *   - Google Cloud Scheduler
 *   - Heroku Scheduler
 *   - Third-party cron services (cron-job.org, etc.)
 * - Have them call: POST /api/admin/reminders/process
 * 
 * Option 3: Using a message queue
 * - Set up a job queue like Bull or RabbitMQ
 * - Enqueue reminder processing jobs
 * - Process them with workers
 */
