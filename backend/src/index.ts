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
import stripeRoutes from "./routes/stripe.routes";
import stripePortalRoutes from "./routes/stripe.portal.routes";
import { handleStripeWebhook } from "./controllers/stripe.controller";
import { requestId, sanitizeInputs } from "./middleware/security.middleware";

// Load env from backend/.env first, then fallback to root/.env for monorepo runs.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env"), override: false });

const app = express();
const PORT = process.env.PORT ?? 4000;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'none'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      process.env.WEB_URL ?? "http://localhost:3000",
      process.env.ADMIN_URL ?? "http://localhost:3001",
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "x-request-id"],
    exposedHeaders: ["x-request-id"],
  })
);

// ── Request tracing ───────────────────────────────────────────────────────────
app.use(requestId);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(globalLimiter);

// Auth endpoints — tight limit to slow brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts, please try again later." },
});

// AI endpoints — expensive per-call; prevent abuse
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: "AI rate limit reached. Please wait and try again." },
});

// Messaging — prevent spam flooding
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Message rate limit reached. Please slow down." },
});

// Admin — limit operational surface
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many admin requests." },
});

// ── Stripe webhook (raw body required for signature verification) ──────────────
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "64kb" }));

// ── Input sanitization (applied after JSON parsing) ───────────────────────────
app.use(sanitizeInputs);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/messages", messageLimiter, messageRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/post-conversation", aiLimiter, postConversationRoutes);
app.use("/api/admin", adminLimiter, adminRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/stripe-portal", stripePortalRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ── Error handler ─────────────────────────────────────────────────────────────
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
