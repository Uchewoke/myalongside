/**
 * Permissions: RBAC matrix + ABAC policies + state-machine constraints.
 *
 * Usage:
 *   can("MENTOR", "mentor_copilot", "write")              → true/false
 *   evaluate(policies.isOwner, { userId, role, resourceOwnerId })
 *   isValidTransition("PENDING", "ACTIVE")                → true
 */

export type Role = "SEEKER" | "MENTOR" | "ADMIN";
export type Action = "read" | "write" | "delete" | "admin";
export type Resource =
  | "profile"
  | "match"
  | "message"
  | "conversation"
  | "ai_suggestion"
  | "mentor_copilot"
  | "ai_safety"
  | "user_management"
  | "audit_log"
  | "reminder"
  | "report";

// ── RBAC matrix ───────────────────────────────────────────────────────────────

const MATRIX: Record<Role, Partial<Record<Resource, Action[]>>> = {
  SEEKER: {
    profile: ["read", "write", "delete"],
    match: ["read", "write"],
    message: ["read", "write"],
    conversation: ["read"],
    ai_suggestion: ["read", "write"],
    report: ["write"],
  },
  MENTOR: {
    profile: ["read", "write", "delete"],
    match: ["read", "write"],
    message: ["read", "write"],
    conversation: ["read"],
    ai_suggestion: ["read", "write"],
    mentor_copilot: ["read", "write"],
    report: ["write"],
  },
  ADMIN: {
    profile: ["read", "write", "delete", "admin"],
    match: ["read", "write", "delete", "admin"],
    message: ["read", "write", "delete", "admin"],
    conversation: ["read", "write", "delete", "admin"],
    ai_suggestion: ["read", "write", "delete", "admin"],
    mentor_copilot: ["read", "write", "admin"],
    ai_safety: ["read", "write", "admin"],
    user_management: ["read", "write", "delete", "admin"],
    audit_log: ["read", "admin"],
    reminder: ["read", "write", "admin"],
    report: ["read", "write", "admin"],
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return MATRIX[role]?.[resource]?.includes(action) ?? false;
}

// ── Subscription feature gates ────────────────────────────────────────────────

const TIER_FEATURES: Record<string, string[]> = {
  FREE: ["ai_suggestion_intro", "ai_suggestion_starters"],
  PLUS: [
    "ai_suggestion_intro",
    "ai_suggestion_starters",
    "ai_suggestion_response",
    "mentor_copilot_empathy",
    "mentor_copilot_follow_up",
    "mentor_copilot_resources",
    "mentor_copilot_boundary",
  ],
  PRO: [
    "ai_suggestion_intro",
    "ai_suggestion_starters",
    "ai_suggestion_response",
    "mentor_copilot_empathy",
    "mentor_copilot_follow_up",
    "mentor_copilot_resources",
    "mentor_copilot_boundary",
    "api_access",
    "advanced_analytics",
  ],
};

export function hasTierFeature(tier: string | null | undefined, feature: string): boolean {
  const t = (tier ?? "FREE").toUpperCase();
  return (TIER_FEATURES[t] ?? TIER_FEATURES.FREE).includes(feature);
}

// ── ABAC policies ────────────────────────────────────────────────────────────

export interface ABACContext {
  userId: string;
  role: Role;
  subscriptionTier?: string | null;
  resourceOwnerId?: string;
  resourceParticipants?: string[];
}

export type ABACPolicy = (ctx: ABACContext) => boolean;

export const policies = {
  /** Admin bypass + ownership OR participant */
  isOwnerOrParticipant(ctx: ABACContext): boolean {
    if (ctx.role === "ADMIN") return true;
    if (ctx.resourceOwnerId && ctx.userId === ctx.resourceOwnerId) return true;
    return ctx.resourceParticipants?.includes(ctx.userId) ?? false;
  },

  /** Admin bypass + strict ownership */
  isOwner(ctx: ABACContext): boolean {
    if (ctx.role === "ADMIN") return true;
    return ctx.resourceOwnerId === ctx.userId;
  },

  /** Must be a conversation participant */
  isParticipant(ctx: ABACContext): boolean {
    if (ctx.role === "ADMIN") return true;
    return ctx.resourceParticipants?.includes(ctx.userId) ?? false;
  },

  /** Must be the mentor-side participant */
  isMentorParticipant(ctx: ABACContext): boolean {
    if (ctx.role !== "MENTOR") return false;
    return ctx.resourceParticipants?.includes(ctx.userId) ?? false;
  },
} satisfies Record<string, ABACPolicy>;

export function evaluate(policy: ABACPolicy, ctx: ABACContext): boolean {
  return policy(ctx);
}

// ── Match state-machine ───────────────────────────────────────────────────────

const MATCH_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["ACTIVE", "DECLINED"],
  ACTIVE: ["PAUSED", "COMPLETED"],
  PAUSED: ["ACTIVE", "COMPLETED"],
  COMPLETED: [],
  DECLINED: [],
};

export function isValidMatchTransition(from: string, to: string): boolean {
  return MATCH_TRANSITIONS[from]?.includes(to) ?? false;
}
