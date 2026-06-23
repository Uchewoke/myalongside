/**
 * Security middleware collection.
 *
 * requestId        – stamp every request with a traceable UUID
 * sanitizeInputs   – strip null bytes / control chars from body string fields
 * idempotency      – header key validation; checkIdempotency() for DB-backed replay
 */

import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";

// ── Request ID ────────────────────────────────────────────────────────────────

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers["x-request-id"];
  const id =
    typeof incomingId === "string" && /^[\w\-]{1,64}$/.test(incomingId)
      ? incomingId
      : randomUUID();
  res.setHeader("x-request-id", id);
  (req as any).requestId = id;
  next();
}

// ── Input sanitization ────────────────────────────────────────────────────────

function sanitizeString(value: string): string {
  return value
    .replace(/\x00/g, "")                        // null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // C0 control chars (keep \t \n \r)
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[sanitizeString(k)] = sanitizeValue(v);
    }
    return out;
  }
  return value;
}

/** Strip dangerous characters from all body string fields. Applied after JSON parsing. */
export function sanitizeInputs(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  next();
}

// ── Idempotency ───────────────────────────────────────────────────────────────

const IDEMPOTENCY_KEY_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates the Idempotency-Key header format (UUID v4).
 * Attaches req.idempotencyKey if valid; rejects with 400 if malformed.
 */
export function idempotency(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["idempotency-key"] as string | undefined;
  if (!key) {
    next();
    return;
  }
  if (!IDEMPOTENCY_KEY_RE.test(key)) {
    res.status(400).json({ error: "Idempotency-Key must be a UUID v4." });
    return;
  }
  (req as any).idempotencyKey = key;
  next();
}

/**
 * Wrap a mutating handler with idempotency-key replay protection.
 *
 * @param userId    Authenticated user performing the action
 * @param key       The raw UUID from the Idempotency-Key header (may be undefined)
 * @param endpoint  Stable endpoint identifier, e.g. "POST /api/matches"
 * @param execute   The real work to do if no cached response exists
 */
export async function checkIdempotency(
  userId: string,
  key: string | undefined,
  endpoint: string,
  execute: () => Promise<{ status: number; body: unknown }>
): Promise<{ status: number; body: unknown }> {
  if (!key) return execute();

  const fullKey = `${userId}:${endpoint}:${key}`;

  const existing = await prisma.idempotencyKey.findUnique({ where: { key: fullKey } });
  if (existing) {
    return { status: existing.statusCode, body: existing.response };
  }

  const result = await execute();

  // Expire idempotency records after 24 h
  await prisma.idempotencyKey.create({
    data: {
      key: fullKey,
      userId,
      endpoint,
      response: result.body as any,
      statusCode: result.status,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return result;
}
