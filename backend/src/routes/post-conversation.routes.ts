import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  endConversation,
  getConversationSummary,
  getActionPlan,
  updateActionItemStatus,
  getReflectionPrompts,
  submitReflectionResponse,
  getProgressSnapshot,
  getCheckInReminders,
} from "../controllers/post-conversation.controller";

const router = Router();

// All post-conversation routes require authentication
router.use(requireAuth);

/**
 * End conversation and generate post-conversation analysis
 * POST /api/post-conversation/end-conversation
 * Body: { conversationId }
 */
router.post("/end-conversation", endConversation);

/**
 * Get conversation summary
 * GET /api/post-conversation/:conversationId/summary
 */
router.get("/:conversationId/summary", getConversationSummary);

/**
 * Get action plan items
 * GET /api/post-conversation/:conversationId/action-plan
 */
router.get("/:conversationId/action-plan", getActionPlan);

/**
 * Update action item status
 * PUT /api/post-conversation/:conversationId/action-item/:actionItemId/status
 * Body: { status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" }
 */
router.put("/:conversationId/action-item/:actionItemId/status", updateActionItemStatus);

/**
 * Get reflection prompts for the current user
 * GET /api/post-conversation/:conversationId/reflection-prompts
 */
router.get("/:conversationId/reflection-prompts", getReflectionPrompts);

/**
 * Submit reflection response
 * POST /api/post-conversation/:conversationId/reflection-response
 * Body: { promptId, response }
 */
router.post("/:conversationId/reflection-response", submitReflectionResponse);

/**
 * Get progress snapshot
 * GET /api/post-conversation/:conversationId/progress-snapshot
 */
router.get("/:conversationId/progress-snapshot", getProgressSnapshot);

/**
 * Get check-in reminders
 * GET /api/post-conversation/:conversationId/reminders
 */
router.get("/:conversationId/reminders", getCheckInReminders);

export default router;
