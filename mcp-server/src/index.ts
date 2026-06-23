#!/usr/bin/env node
/**
 * MyAlongside MCP Server
 *
 * Exposes the MyAlongside platform (mentorship + AI features) as MCP tools
 * so any MCP-compatible AI assistant can interact with the platform.
 *
 * Transport: stdio (standard for local MCP servers)
 *
 * Environment variables:
 *   MYALONGSIDE_API_URL    – backend base URL  (default: http://localhost:4000)
 *   MYALONGSIDE_AUTH_TOKEN – optional pre-set bearer token
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { z } from "zod";

// ── Runtime state ──────────────────────────────────────────────────────────
const API_URL = (process.env.MYALONGSIDE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

let authToken: string = process.env.MYALONGSIDE_AUTH_TOKEN ?? "";

// ── HTTP helpers ───────────────────────────────────────────────────────────
async function apiFetch(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    requiresAuth?: boolean;
  } = {}
): Promise<unknown> {
  const { method = "GET", body, requiresAuth = true } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requiresAuth) {
    if (!authToken) {
      throw new Error("Not authenticated. Call the `login` tool first.");
    }
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as Record<string, unknown>).error)
        : text;
    throw new Error(`API error ${res.status}: ${msg}`);
  }

  return json;
}

function ok(data: unknown): { content: [{ type: "text"; text: string }] } {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

// ── MCP Server ─────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "myalongside",
  version: "1.0.0",
});

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "get_platform_health",
  { description: "Check whether the MyAlongside backend is running and healthy." },
  async () => {
    const data = await apiFetch("/health", { requiresAuth: false });
    return ok(data);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "login",
  {
    description: "Authenticate with the MyAlongside platform. Stores the returned access token for all subsequent tool calls in this session.",
    inputSchema: {
      email: z.string().email().describe("User email address"),
      password: z.string().min(1).describe("User password"),
    },
  },
  async ({ email, password }) => {
    const data = (await apiFetch("/api/auth/login", {
      method: "POST",
      body: { email, password },
      requiresAuth: false,
    })) as Record<string, unknown>;

    if (data.accessToken && typeof data.accessToken === "string") {
      authToken = data.accessToken;
    }

    // Never return the raw token — just confirm success and surface safe fields.
    const { accessToken: _redacted, ...safe } = data;
    return ok({ authenticated: true, ...safe });
  }
);

server.registerTool(
  "get_my_profile",
  { description: "Get the authenticated user's profile, including settings and subscription tier." },
  async () => {
    const data = await apiFetch("/api/auth/profile");
    return ok(data);
  }
);

server.registerTool(
  "update_my_profile",
  {
    description: "Update the authenticated user's profile fields (name, bio, location, languages, settings).",
    inputSchema: {
      name: z.string().optional().describe("Display name"),
      bio: z.string().optional().describe("Short bio"),
      location: z.string().optional().describe("City / country"),
      languages: z.array(z.string()).optional().describe("Spoken languages"),
      settings: z.record(z.unknown()).optional().describe("Arbitrary user settings JSON"),
    },
  },
  async (patch) => {
    const data = await apiFetch("/api/auth/profile", { method: "PATCH", body: patch });
    return ok(data);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// MENTORS
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "list_mentors",
  { description: "List all available mentors on the platform." },
  async () => {
    const data = await apiFetch("/api/mentors");
    return ok(data);
  }
);

server.registerTool(
  "search_mentors",
  {
    description: "Search and rank mentors by life-event slug or free-text query.",
    inputSchema: {
      lifeEventSlug: z
        .string()
        .optional()
        .describe("Life-event slug to match mentors against (e.g. 'divorce', 'job-loss')"),
      query: z.string().optional().describe("Free-text search query"),
    },
  },
  async ({ lifeEventSlug, query }) => {
    const params = new URLSearchParams();
    if (lifeEventSlug) params.set("lifeEventSlug", lifeEventSlug);
    if (query) params.set("q", query);
    const qs = params.toString();
    const data = await apiFetch(`/api/mentors/search${qs ? `?${qs}` : ""}`);
    return ok(data);
  }
);

server.registerTool(
  "get_mentor",
  {
    description: "Get the full profile for a specific mentor by their user ID.",
    inputSchema: {
      mentorId: z.string().describe("Mentor user ID"),
    },
  },
  async ({ mentorId }) => {
    const data = await apiFetch(`/api/mentors/${mentorId}`);
    return ok(data);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// MATCHES
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "list_my_matches",
  { description: "List all matches (pending, active, paused, completed) for the authenticated user." },
  async () => {
    const data = await apiFetch("/api/matches");
    return ok(data);
  }
);

server.registerTool(
  "create_match",
  {
    description: "Request a mentorship match with a specific mentor.",
    inputSchema: {
      mentorId: z.string().describe("User ID of the mentor"),
      lifeEventId: z.string().optional().describe("Life-event ID this match relates to"),
      initiatorNote: z
        .string()
        .max(500)
        .optional()
        .describe("Optional introductory note sent with the match request"),
    },
  },
  async ({ mentorId, lifeEventId, initiatorNote }) => {
    const data = await apiFetch("/api/matches", {
      method: "POST",
      body: { mentorId, lifeEventId, initiatorNote },
    });
    return ok(data);
  }
);

server.registerTool(
  "update_match_status",
  {
    description: "Update the status of a match (ACTIVE, PAUSED, COMPLETED, DECLINED).",
    inputSchema: {
      matchId: z.string().describe("Match ID"),
      status: z
        .enum(["ACTIVE", "PAUSED", "COMPLETED", "DECLINED"])
        .describe("New status for the match"),
    },
  },
  async ({ matchId, status }) => {
    const data = await apiFetch(`/api/matches/${matchId}/status`, {
      method: "PATCH",
      body: { status },
    });
    return ok(data);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES / CONVERSATIONS
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "get_conversation",
  {
    description: "Get a conversation thread with all messages.",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
    },
  },
  async ({ conversationId }) => {
    const data = await apiFetch(`/api/messages/${conversationId}`);
    return ok(data);
  }
);

server.registerTool(
  "send_message",
  {
    description: "Send a text message in a conversation.",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
      content: z.string().min(1).max(4000).describe("Message text"),
    },
  },
  async ({ conversationId, content }) => {
    const data = await apiFetch(`/api/messages/${conversationId}`, {
      method: "POST",
      body: { content },
    });
    return ok(data);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// AI SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "generate_intro_suggestion",
  {
    description: "Generate an AI-powered intro message suggestion for a seeker reaching out to a mentor.",
    inputSchema: {
      mentorId: z.string().describe("Mentor user ID"),
      initialMessage: z.string().describe("The seeker's draft intro message"),
    },
  },
  async ({ mentorId, initialMessage }) => {
    const data = await apiFetch("/api/ai/suggestions/intro", {
      method: "POST",
      body: { mentorId, initialMessage },
    });
    return ok(data);
  }
);

server.registerTool(
  "generate_response_suggestion",
  {
    description: "Generate an AI-powered response suggestion for a mentor replying to a seeker message.",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
      messageContent: z.string().describe("The seeker's most recent message"),
    },
  },
  async ({ conversationId, messageContent }) => {
    const data = await apiFetch("/api/ai/suggestions/response", {
      method: "POST",
      body: { conversationId, messageContent },
    });
    return ok(data);
  }
);

server.registerTool(
  "get_conversation_starters",
  {
    description: "Get AI-generated conversation starter ideas for a given life-event.",
    inputSchema: {
      lifeEventId: z.string().optional().describe("Life-event ID to tailor starters to"),
    },
  },
  async ({ lifeEventId }) => {
    const qs = lifeEventId ? `?lifeEventId=${encodeURIComponent(lifeEventId)}` : "";
    const data = await apiFetch(`/api/ai/suggestions/starters${qs}`);
    return ok(data);
  }
);

server.registerTool(
  "accept_suggestion",
  {
    description: "Mark an AI suggestion as accepted/used.",
    inputSchema: {
      suggestionId: z.string().describe("AI suggestion ID"),
    },
  },
  async ({ suggestionId }) => {
    const data = await apiFetch(`/api/ai/suggestions/${suggestionId}/accept`, {
      method: "POST",
    });
    return ok(data);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// MENTOR COPILOT
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "generate_empathy_draft",
  {
    description: "Mentor Copilot: generate an empathy-focused draft reply for a mentor to use.",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
      messageContent: z.string().describe("The seeker's message the mentor is responding to"),
    },
  },
  async ({ conversationId, messageContent }) => {
    const data = await apiFetch("/api/ai/mentor-copilot/empathy-drafting", {
      method: "POST",
      body: { conversationId, messageContent },
    });
    return ok(data);
  }
);

server.registerTool(
  "generate_follow_up_questions",
  {
    description: "Mentor Copilot: generate contextual follow-up questions a mentor can ask the seeker.",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
      messageContent: z.string().describe("The seeker's latest message"),
    },
  },
  async ({ conversationId, messageContent }) => {
    const data = await apiFetch("/api/ai/mentor-copilot/follow-up-questions", {
      method: "POST",
      body: { conversationId, messageContent },
    });
    return ok(data);
  }
);

server.registerTool(
  "generate_resource_recommendations",
  {
    description: "Mentor Copilot: recommend external resources (articles, books, tools) relevant to the seeker's challenges.",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
      lifeEvent: z.string().describe("Life-event label or slug"),
      discussionTopics: z.array(z.string()).describe("Main topics discussed in the conversation"),
      seekerChallenges: z.array(z.string()).describe("Specific challenges the seeker is facing"),
    },
  },
  async ({ conversationId, lifeEvent, discussionTopics, seekerChallenges }) => {
    const data = await apiFetch("/api/ai/mentor-copilot/resource-recommendations", {
      method: "POST",
      body: { conversationId, lifeEvent, discussionTopics, seekerChallenges },
    });
    return ok(data);
  }
);

server.registerTool(
  "check_boundary_language",
  {
    description: "Mentor Copilot: check a draft mentor message for appropriate boundary language and flag any issues.",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
      draftMessage: z.string().describe("The mentor's draft reply to check"),
    },
  },
  async ({ conversationId, draftMessage }) => {
    const data = await apiFetch("/api/ai/mentor-copilot/boundary-check", {
      method: "POST",
      body: { conversationId, draftMessage },
    });
    return ok(data);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// POST-CONVERSATION
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "end_conversation",
  {
    description: "End a conversation and trigger the AI post-conversation analysis (summary, action items, reflection prompts).",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID to end"),
    },
  },
  async ({ conversationId }) => {
    const data = await apiFetch("/api/post-conversation/end-conversation", {
      method: "POST",
      body: { conversationId },
    });
    return ok(data);
  }
);

server.registerTool(
  "get_conversation_summary",
  {
    description: "Get the AI-generated summary for a completed conversation.",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
    },
  },
  async ({ conversationId }) => {
    const data = await apiFetch(`/api/post-conversation/${conversationId}/summary`);
    return ok(data);
  }
);

server.registerTool(
  "get_action_plan",
  {
    description: "Get the action items generated for a conversation.",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
    },
  },
  async ({ conversationId }) => {
    const data = await apiFetch(`/api/post-conversation/${conversationId}/action-plan`);
    return ok(data);
  }
);

server.registerTool(
  "update_action_item_status",
  {
    description: "Update the status of a specific action item (PENDING, IN_PROGRESS, COMPLETED, SKIPPED).",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
      actionItemId: z.string().describe("Action item ID"),
      status: z
        .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"])
        .describe("New status for the action item"),
    },
  },
  async ({ conversationId, actionItemId, status }) => {
    const data = await apiFetch(
      `/api/post-conversation/${conversationId}/action-item/${actionItemId}/status`,
      { method: "PUT", body: { status } }
    );
    return ok(data);
  }
);

server.registerTool(
  "get_reflection_prompts",
  {
    description: "Get the reflection prompts generated for the authenticated user in a conversation.",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
    },
  },
  async ({ conversationId }) => {
    const data = await apiFetch(`/api/post-conversation/${conversationId}/reflection-prompts`);
    return ok(data);
  }
);

server.registerTool(
  "submit_reflection_response",
  {
    description: "Submit a written response to a reflection prompt.",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
      promptId: z.string().describe("Reflection prompt ID"),
      response: z.string().min(1).describe("The user's reflection response text"),
    },
  },
  async ({ conversationId, promptId, response }) => {
    const data = await apiFetch(`/api/post-conversation/${conversationId}/reflection-response`, {
      method: "POST",
      body: { promptId, response },
    });
    return ok(data);
  }
);

server.registerTool(
  "get_progress_snapshot",
  {
    description: "Get the progress snapshot for a conversation, showing growth indicators over time.",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
    },
  },
  async ({ conversationId }) => {
    const data = await apiFetch(`/api/post-conversation/${conversationId}/progress-snapshot`);
    return ok(data);
  }
);

server.registerTool(
  "get_check_in_reminders",
  {
    description: "Get scheduled check-in reminders for a conversation.",
    inputSchema: {
      conversationId: z.string().describe("Conversation ID"),
    },
  },
  async ({ conversationId }) => {
    const data = await apiFetch(`/api/post-conversation/${conversationId}/check-in-reminders`);
    return ok(data);
  }
);

// ── Start ──────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
