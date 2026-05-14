import path from "path";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes";
import mentorRoutes from "./routes/mentor.routes";
import matchRoutes from "./routes/match.routes";
import messageRoutes from "./routes/message.routes";
import aiRoutes from "./routes/ai.routes";
import postConversationRoutes from "./routes/post-conversation.routes";
import adminRoutes from "./routes/admin.routes";

// Load env from backend/.env first, then fallback to root/.env for monorepo runs.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env"), override: false });

const app = express();
const PORT = process.env.PORT ?? 4000;

// ── Security middleware ──
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.WEB_URL ?? "http://localhost:3000",
      process.env.ADMIN_URL ?? "http://localhost:3001",
    ],
    credentials: true,
  })
);

// ── Rate limiting ──
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts, please try again later." },
});

// ── Body parsing ──
app.use(express.json({ limit: "64kb" }));

// ── Health check ──
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ──
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/post-conversation", postConversationRoutes);
app.use("/api/admin", adminRoutes);

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ── Error handler ──
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
);

app.listen(PORT, () => {
  console.log(`MyAlongside API running on http://localhost:${PORT}`);
});

export default app;
