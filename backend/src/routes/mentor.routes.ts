import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { listMentors, getMentor } from "../controllers/mentor.controller";

const router = Router();

router.get("/", requireAuth, listMentors);
router.get("/:id", requireAuth, getMentor);

export default router;
