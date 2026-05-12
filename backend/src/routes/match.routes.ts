import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  createMatch,
  listMyMatches,
  updateMatchStatus,
} from "../controllers/match.controller";

const router = Router();

router.post("/", requireAuth, createMatch);
router.get("/", requireAuth, listMyMatches);
router.patch("/:id/status", requireAuth, updateMatchStatus);

export default router;
