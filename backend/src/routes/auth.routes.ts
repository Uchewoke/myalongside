import { Router } from "express";
import {
	signup,
	login,
	refreshToken,
	logout,
	getProfile,
	updateProfile,
	deleteProfile,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/profile", requireAuth, getProfile);
router.patch("/profile", requireAuth, updateProfile);
router.delete("/profile", requireAuth, deleteProfile);

export default router;
