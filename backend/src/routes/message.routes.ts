import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getConversation,
  sendMessage,
} from "../controllers/message.controller";

const router = Router();

router.get("/:conversationId", requireAuth, getConversation);
router.post("/:conversationId", requireAuth, sendMessage);

export default router;
