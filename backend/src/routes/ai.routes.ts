import { Router } from "express";
import { requireAdminAccess, requireAuth } from "../middleware/auth.middleware";
import {
  generateIntroSuggestion,
  generateResponseSuggestion,
  getConversationStarters,
  acceptSuggestion,
  generateSafetyIntelligence,
  generateEmpathyDrafting,
  generateFollowUpQuestions,
  generateResourceRecommendations,
  checkBoundaryLanguage,
} from "../controllers/ai.controller";

const router = Router();

/**
 * Admin-only safety intelligence endpoint used by the moderation surface.
 */
router.post("/safety/intelligence", requireAdminAccess, generateSafetyIntelligence);

// All AI routes require authentication
router.use(requireAuth);

/**
 * Generate intro message suggestions
 * POST /api/ai/suggestions/intro
 * Body: { mentorId, initialMessage }
 */
router.post("/suggestions/intro", generateIntroSuggestion);

/**
 * Generate response suggestions for mentors
 * POST /api/ai/suggestions/response
 * Body: { conversationId, messageContent }
 */
router.post("/suggestions/response", generateResponseSuggestion);

/**
 * Get conversation starter suggestions
 * GET /api/ai/suggestions/starters?lifeEventId=xxx
 */
router.get("/suggestions/starters", getConversationStarters);

/**
 * Accept/use a suggestion
 * POST /api/ai/suggestions/:suggestionId/accept
 */
router.post("/suggestions/:suggestionId/accept", acceptSuggestion);

/**
 * ===== MENTOR COPILOT ROUTES =====
 * Enhanced features for raising mentor quality and consistency
 */

/**
 * Generate empathy-focused response drafts
 * POST /api/ai/mentor-copilot/empathy-drafting
 * Body: { conversationId, messageContent }
 */
router.post("/mentor-copilot/empathy-drafting", generateEmpathyDrafting);

/**
 * Generate contextual follow-up questions
 * POST /api/ai/mentor-copilot/follow-up-questions
 * Body: { conversationId, messageContent }
 */
router.post("/mentor-copilot/follow-up-questions", generateFollowUpQuestions);

/**
 * Generate resource recommendations
 * POST /api/ai/mentor-copilot/resource-recommendations
 * Body: { conversationId, lifeEvent, discussionTopics[], seekerChallenges[] }
 */
router.post("/mentor-copilot/resource-recommendations", generateResourceRecommendations);

/**
 * Check draft message for boundary-safe language
 * POST /api/ai/mentor-copilot/boundary-check
 * Body: { conversationId, draftMessage }
 */
router.post("/mentor-copilot/boundary-check", checkBoundaryLanguage);

export default router;
