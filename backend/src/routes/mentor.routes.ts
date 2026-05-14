import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { listMentors, getMentor, rankedMentorSearch } from "../controllers/mentor.controller";

const router = Router();

router.get("/search", requireAuth, rankedMentorSearch);
router.get("/", requireAuth, listMentors);
router.get("/:id", requireAuth, getMentor);

export default router;
