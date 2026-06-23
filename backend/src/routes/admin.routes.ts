import { Router, Response } from "express";
import { ReminderService } from "../services/reminder.service";
import {
  AuthRequest,
  requireAdminServiceToken,
  requireAdminUser,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * Admin endpoint to process due reminders
 * This should only be called by authorized systems (admin service or cron jobs)
 * 
 * POST /api/admin/reminders/process
 * Headers: 
 *   x-admin-service-token: ADMIN_SERVICE_TOKEN
 */
router.post("/reminders/process", requireAdminServiceToken, async (req: AuthRequest, res: Response) => {
  try {
    // Process due reminders
    const sentCount = await ReminderService.processDueReminders();

    res.json({
      success: true,
      remindersProcessed: sentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing reminders:", error);
    res.status(500).json({ error: "Failed to process reminders" });
  }
});

/**
 * Get reminder statistics for the current user
 * GET /api/admin/reminders/stats
 */
router.get(
  "/reminders/stats",
  requireAdminUser,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.sub;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const stats = await ReminderService.getReminderStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching reminder stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  }
);

export default router;
