import { OpenAI } from "openai";
import { sanitizeOutputUrl } from "../lib/ssrf-guard";

type SafetyMode = "conversation" | "report" | "mentor";
type SafetySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type SafetyPriority = "ROUTINE" | "PRIORITY" | "URGENT" | "IMMEDIATE";

interface SafetyIntelligenceOptions {
  mode: SafetyMode;
  content: string;
  subject?: string;
  reporterName?: string;
  reportedName?: string;
  mentorName?: string;
  seekerName?: string;
  conversationHistory?: string[];
  extraContext?: string[];
}

export interface SafetyIntelligenceResult {
  mode: SafetyMode;
  summary: string;
  adminSummary: string;
  severity: SafetySeverity;
  priority: SafetyPriority;
  crisisDetected: boolean;
  flags: string[];
  escalationActions: string[];
  boundaries: string[];
  mentorGuidance: string[];
  confidence: number;
  needsHumanReview: boolean;
}

interface SuggestionContext {
  seekerName: string;
  seekerBio?: string;
  seekerEvents: string[];
  mentorName: string;
  mentorTagline: string;
  mentorYearsExperience: number;
  conversationHistory?: string[];
}

interface IntroSuggestionOptions extends SuggestionContext {
  seekerMessage: string;
}

interface ResponseSuggestionOptions extends SuggestionContext {
  seekerMessage: string;
}

interface StarterOptions {
  lifeEvents: string[];
  eventDescription: string;
}

interface PostConversationContext {
  conversationHistory: Array<{ sender: string; content: string }>;
  seekerName: string;
  seekerRole: "SEEKER" | "MENTOR";
  mentorName: string;
  mentorRole: "SEEKER" | "MENTOR";
  lifeEvent: string;
}

interface ConversationSummaryResult {
  summaryForSeeker: string;
  summaryForMentor: string;
  keyThemes: string[];
  emotionalTone: string;
}

interface ActionPlanResult {
  actionItems: Array<{
    title: string;
    description: string;
    assignedTo: "SEEKER" | "MENTOR";
    priority: "HIGH" | "MEDIUM" | "LOW";
    dueDate?: string;
  }>;
}

interface ReflectionPromptsResult {
  seekerPrompts: string[];
  mentorPrompts: string[];
}

interface EmpathyDraftingOptions extends SuggestionContext {
  seekerMessage: string;
}

interface EmpathyDraftingResult {
  draftResponses: Array<{
    response: string;
    empathyElements: string[];
    tone: string;
  }>;
}

interface FollowUpQuestionsOptions extends SuggestionContext {
  seekerMessage: string;
  lastMentorMessage?: string;
}

interface FollowUpQuestionsResult {
  questions: Array<{
    question: string;
    purpose: string;
  }>;
}

interface ResourceRecommendationOptions {
  lifeEvent: string;
  conversationTopics: string[];
  mentorExpertise: string;
  seekerChallenges: string[];
}

interface ResourceRecommendationResult {
  resources: Array<{
    title: string;
    type: "article" | "exercise" | "tool" | "book" | "video";
    description: string;
    relevance: "HIGH" | "MEDIUM";
    url?: string;
  }>;
}

interface BoundaryLanguageCheckOptions {
  draftMessage: string;
  mentorName: string;
  seekerName: string;
  lifeEvent: string;
}

interface BoundaryLanguageCheckResult {
  isSafe: boolean;
  concerns: string[];
  suggestions: Array<{
    original: string;
    suggested: string;
    reason: string;
  }>;
  overallFeedback: string;
}

/**
 * AI Service for generating warm, supportive suggestions
 * for first contact and early conversations in mentorship
 */
class AIService {
  private client: OpenAI;
  private model: string = process.env.AI_MODEL || "gpt-4o-mini";

  constructor() {
    const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

    if (!apiKey) {
      throw new Error("AI_API_KEY environment variable is not set");
    }

    if (endpoint) {
      // Azure OpenAI configuration
      this.client = new OpenAI({
        apiKey,
        baseURL: endpoint,
        defaultQuery: { "api-version": "2024-02-15-preview" },
        defaultHeaders: {
          "api-key": apiKey,
        },
      });
    } else {
      // Standard OpenAI configuration
      this.client = new OpenAI({ apiKey });
    }
  }

  /**
   * Generate intro message suggestions for seekers reaching out to mentors
   */
  async generateIntroSuggestion(
    options: IntroSuggestionOptions
  ): Promise<string[]> {
    const systemPrompt = `You are a warm, empathetic communication coach helping someone reach out to a mentor for the first time. 
Your goal is to help them break through initial hesitation and start a genuine conversation.

Guidelines:
- Be authentic and vulnerable, but not overly emotional
- Show that you've read the mentor's profile
- Be specific about what drew you to this mentor
- Keep it concise (2-3 sentences max for intro)
- Show readiness to listen and learn
- Avoid generic compliments or overly formal language

Generate 3 different opening messages that feel natural and warm, but each with slightly different tones.`;

    const userPrompt = `Context:
- I'm ${options.seekerName} going through: ${options.seekerEvents.join(", ")}
- I want to reach out to ${options.mentorName}, who has expertise in these areas
- Their tagline: "${options.mentorTagline}"
- They have ${options.mentorYearsExperience} years of experience
${options.seekerBio ? `- A bit about me: ${options.seekerBio}` : ""}

My current draft: "${options.seekerMessage}"

Please suggest 3 ways I could refine or reframe this introduction to feel more genuine and warm.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    // Parse response into individual suggestions
    const content = response.choices[0]?.message?.content || "";
    return this.parseSuggestions(content);
  }

  /**
   * Generate response suggestions for mentors replying to seekers
   */
  async generateResponseSuggestion(
    options: ResponseSuggestionOptions
  ): Promise<string[]> {
    const systemPrompt = `You are a mentor communication expert helping experienced mentors respond warmly and authentically to seekers.
Your role is to suggest thoughtful, encouraging responses that:
- Validate the seeker's experience
- Show you've understood their situation
- Ask clarifying questions to deepen understanding
- Offer a concrete first step or conversation direction
- Feel genuine and supportive, never robotic

Generate responses that feel like they're coming from a mentor who genuinely wants to help.`;

    const userPrompt = `Context:
- You are ${options.mentorName}, with ${options.mentorYearsExperience} years of experience
- Your expertise: ${options.mentorTagline}
- You've connected with ${options.seekerName} around: ${options.seekerEvents.join(", ")}
${options.seekerBio ? `- They shared: ${options.seekerBio}` : ""}
- Conversation history so far: ${options.conversationHistory?.join(" / ") || "This is the first exchange"}

The seeker just sent: "${options.seekerMessage}"

Please suggest 3 warm, authentic responses that:
1. Acknowledge what they shared
2. Share a relevant insight or question
3. Move the conversation forward`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 900,
    });

    const content = response.choices[0]?.message?.content || "";
    return this.parseSuggestions(content);
  }

  /**
   * Generate conversation starter suggestions for a life event
   */
  async generateConversationStarters(
    options: StarterOptions
  ): Promise<string[]> {
    const systemPrompt = `You are an expert in peer mentorship conversations. 
Generate thoughtful, supportive conversation starters that help someone begin a meaningful discussion about their life event.

Each starter should:
- Be open-ended but specific
- Invite sharing without pressure
- Show curiosity and care
- Be natural and conversational
- Help the mentor understand the seeker's unique situation

Generate 4 conversation starter prompts that feel warm and inviting.`;

    const userPrompt = `Life event: ${options.lifeEvents.join(", ")}
Description: ${options.eventDescription}

Please suggest 4 conversation starter questions that would help begin a supportive discussion about this experience.
Format each as a natural question someone might ask a friend.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content || "";
    return this.parseSuggestions(content, 4);
  }

  /**
   * Generate safety intelligence for conversations, user reports, or mentor coaching.
   */
  async generateSafetyIntelligence(
    options: SafetyIntelligenceOptions
  ): Promise<SafetyIntelligenceResult> {
    const systemPrompt = this.buildSafetySystemPrompt(options.mode);
    const userPrompt = this.buildSafetyUserPrompt(options);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 900,
    });

    const content = response.choices[0]?.message?.content || "";
    return this.parseSafetyIntelligence(content, options.mode);
  }

  /**
   * Generate a comprehensive summary of the conversation for both parties
   */
  async generateConversationSummary(
    context: PostConversationContext
  ): Promise<ConversationSummaryResult> {
    const conversationText = context.conversationHistory
      .map((msg) => `${msg.sender}: ${msg.content}`)
      .join("\n");

    const systemPrompt = `You are a thoughtful conversation analyst for a mentorship platform.
Your role is to create warm, actionable summaries that help both mentors and seekers reflect on their conversation.

For the SEEKER summary:
- Highlight key insights or "aha moments"
- Acknowledge the mentor's wisdom shared
- Note specific actionable steps forward
- Be encouraging about progress

For the MENTOR summary:
- Capture the seeker's key challenges and growth areas
- Note themes and patterns
- Highlight areas where the seeker showed resilience or openness
- Reflect on the mentorship impact

Return valid JSON with these fields:
- summaryForSeeker: string (2-3 sentences)
- summaryForMentor: string (2-3 sentences)
- keyThemes: array of 3-4 main discussion themes
- emotionalTone: one word describing the overall tone (e.g., "supportive", "challenging", "exploratory")`;

    const userPrompt = `Life event: ${context.lifeEvent}
Seeker: ${context.seekerName}
Mentor: ${context.mentorName}

Conversation:
${conversationText}

Create personalized summaries that capture the essence of this conversation.
Return a valid JSON object only.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "";
    return this.parseConversationSummary(content);
  }

  /**
   * Generate actionable items from the conversation
   */
  async generateActionPlan(
    context: PostConversationContext
  ): Promise<ActionPlanResult> {
    const conversationText = context.conversationHistory
      .map((msg) => `${msg.sender}: ${msg.content}`)
      .join("\n");

    const systemPrompt = `You are an action planning expert for mentorship conversations.
Your role is to identify concrete, specific action items that came up during the conversation.

Guidelines:
- Extract only items that were explicitly discussed or implied
- Make actions specific and measurable (not vague)
- Assign to either SEEKER or MENTOR based on who should take action
- Set realistic timelines (3 days, 1 week, 2 weeks)
- Prioritize based on impact and urgency

Return valid JSON with this field:
- actionItems: array of objects with:
  - title: short action title
  - description: 1-2 sentence description
  - assignedTo: either "SEEKER" or "MENTOR"
  - priority: "HIGH", "MEDIUM", or "LOW"
  - dueDate: optional date like "3 days" or "1 week"`;

    const userPrompt = `Life event: ${context.lifeEvent}
Seeker: ${context.seekerName}
Mentor: ${context.mentorName}

Conversation:
${conversationText}

Identify 2-4 specific, actionable next steps from this conversation.
Return a valid JSON object only.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 900,
    });

    const content = response.choices[0]?.message?.content || "";
    return this.parseActionPlan(content);
  }

  /**
   * Generate reflection prompts for both mentor and seeker
   */
  async generateReflectionPrompts(
    context: PostConversationContext
  ): Promise<ReflectionPromptsResult> {
    const conversationText = context.conversationHistory
      .map((msg) => `${msg.sender}: ${msg.content}`)
      .join("\n");

    const systemPrompt = `You are a reflection coach for mentorship conversations.
Your role is to create thoughtful, introspective questions that help both seekers and mentors deepen their learning.

For SEEKER prompts:
- Focus on personal growth and self-discovery
- Help them process what they learned
- Encourage deeper reflection on insights
- Promote agency and empowerment

For MENTOR prompts:
- Focus on mentoring effectiveness
- Help them reflect on their approach
- Encourage continuous mentor growth
- Promote impact awareness

Create 2-3 thoughtful questions for each person.
Return valid JSON with:
- seekerPrompts: array of 2-3 reflection questions for the seeker
- mentorPrompts: array of 2-3 reflection questions for the mentor`;

    const userPrompt = `Life event: ${context.lifeEvent}
Seeker: ${context.seekerName}
Mentor: ${context.mentorName}

Conversation:
${conversationText}

Create personalized reflection prompts that will help both the seeker and mentor learn from this conversation.
Return a valid JSON object only.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "";
    return this.parseReflectionPrompts(content);
  }

  /**
   * Generate empathy-focused response drafts for mentors
   * Enhanced with emotional awareness and validation
   */
  async generateEmpathyDrafting(
    options: EmpathyDraftingOptions
  ): Promise<EmpathyDraftingResult> {
    const systemPrompt = `You are an empathy coach for mentors in peer mentorship conversations.
Your role is to help mentors craft responses that deeply validate the seeker's experience while moving them toward growth.

Guidelines:
- Start with validation of their emotions/experience
- Normalize their feelings (you're not alone in this)
- Share relatable insight or reflection
- Ask empowering follow-up question
- Never minimize or rush to solutions
- Avoid toxic positivity; be authentic

For each response, identify:
1. The empathy elements (validation, normalization, reflection)
2. The emotional tone (supportive, understanding, warm)

Generate 3 different empathy-focused response options.
Return valid JSON with:
- draftResponses: array of objects with:
  - response: the full suggested message
  - empathyElements: array of the empathetic techniques used
  - tone: description of emotional tone`;

    const userPrompt = `Context:
- Mentor: ${options.mentorName} (${options.mentorYearsExperience} years experience)
- Seeker: ${options.seekerName}
- They're discussing: ${options.seekerEvents.join(", ")}
${options.seekerBio ? `- Seeker context: ${options.seekerBio}` : ""}
${options.conversationHistory && options.conversationHistory.length > 0 ? `- Prior exchanges: ${options.conversationHistory.slice(-2).join(" | ")}` : ""}

The seeker just shared: "${options.seekerMessage}"

Create 3 responses that deeply validate their experience while maintaining healthy boundaries.
Return a valid JSON object only.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "";
    return this.parseEmpathyDrafting(content);
  }

  /**
   * Generate contextual follow-up questions for mentors
   * Helps move conversation deeper while respecting pace
   */
  async generateFollowUpQuestions(
    options: FollowUpQuestionsOptions
  ): Promise<FollowUpQuestionsResult> {
    const systemPrompt = `You are an expert facilitator for mentorship conversations.
Your role is to suggest follow-up questions that:
- Deepen understanding without being intrusive
- Respect the seeker's emotional state and pace
- Show genuine curiosity
- Invite exploration rather than interrogation
- Help the seeker discover their own insights

For each question, identify its purpose (e.g., "clarify feelings", "explore options", "build agency").

Generate 3-4 follow-up questions that would naturally continue this conversation.
Return valid JSON with:
- questions: array of objects with:
  - question: the follow-up question
  - purpose: why this question moves the conversation forward`;

    const userPrompt = `Context:
- Mentor: ${options.mentorName}
- Seeker: ${options.seekerName}
- Life events: ${options.seekerEvents.join(", ")}

Last seeker message: "${options.seekerMessage}"
${options.lastMentorMessage ? `Your last response: "${options.lastMentorMessage}"` : ""}

Suggest thoughtful follow-up questions that would help the seeker go deeper.
Return a valid JSON object only.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 700,
    });

    const content = response.choices[0]?.message?.content || "";
    return this.parseFollowUpQuestions(content);
  }

  /**
   * Recommend resources based on conversation context
   * Helps mentors offer concrete support beyond conversation
   */
  async generateResourceRecommendations(
    options: ResourceRecommendationOptions
  ): Promise<ResourceRecommendationResult> {
    const systemPrompt = `You are a resource curation expert for mentorship support.
Your role is to recommend high-quality resources that:
- Are specifically relevant to the seeker's challenges
- Complement the mentor's guidance
- Are accessible and actionable
- Include mix of types (articles, exercises, tools, books, videos)
- Include recommendations only for resources you can realistically reference

Recommend 3-5 resources that would genuinely help.
Return valid JSON with:
- resources: array of objects with:
  - title: resource name
  - type: one of "article", "exercise", "tool", "book", "video"
  - description: 1-2 sentence description
  - relevance: "HIGH" or "MEDIUM"
  - url: optional link if applicable`;

    const userPrompt = `Life event: ${options.lifeEvent}
Mentor expertise: ${options.mentorExpertise}
Conversation topics: ${options.conversationTopics.join(", ")}
Seeker challenges: ${options.seekerChallenges.join(", ")}

Recommend resources that would support a seeker facing these challenges.
Return a valid JSON object only.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "";
    return this.parseResourceRecommendations(content);
  }

  /**
   * Check draft message for boundary-safe language
   * Ensures mentors maintain healthy, professional boundaries
   */
  async checkBoundaryLanguage(
    options: BoundaryLanguageCheckOptions
  ): Promise<BoundaryLanguageCheckResult> {
    const systemPrompt = `You are a boundary-safety coach for mentors.
Your role is to review mentor responses to ensure they:
- Maintain healthy professional boundaries
- Don't over-promise or create dependence
- Don't share inappropriate personal details
- Avoid rescuing behavior or enmeshment
- Respect the mentee's autonomy
- Use empowering rather than enabling language

Flag language that:
- Suggests the mentor will "fix" everything
- Violates appropriate professional distance
- Creates unrealistic expectations
- Shows signs of enmeshment
- Disempowers the seeker

For each concern, suggest safer language alternatives.

Return valid JSON with:
- isSafe: boolean (true if generally safe, false if concerns exist)
- concerns: array of specific boundary concerns found
- suggestions: array of objects with:
  - original: the problematic phrase
  - suggested: the improved phrase
  - reason: why this change matters
- overallFeedback: 1-2 sentence summary`;

    const userPrompt = `Life event: ${options.lifeEvent}
Mentor: ${options.mentorName}
Seeker: ${options.seekerName}

Draft message to review:
"${options.draftMessage}"

Review this for boundary-safety and provide feedback.
Return a valid JSON object only.`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 900,
    });

    const content = response.choices[0]?.message?.content || "";
    return this.parseBoundaryLanguageCheck(content);
  }

  /**
   * Parse numbered list responses into individual suggestions
   */
  private parseSuggestions(content: string, count: number = 3): string[] {
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    const suggestions: string[] = [];

    let currentSuggestion = "";
    let suggestionCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if line starts with a number (1., 2., 3., etc.)
      if (/^\d+\./.test(trimmed)) {
        if (currentSuggestion.trim()) {
          suggestions.push(currentSuggestion.trim());
          suggestionCount++;
        }
        currentSuggestion = trimmed.replace(/^\d+\.\s*/, "");
      } else if (suggestionCount < count) {
        currentSuggestion += " " + trimmed;
      }
    }

    // Add the last suggestion
    if (currentSuggestion.trim() && suggestions.length < count) {
      suggestions.push(currentSuggestion.trim());
    }

    return suggestions.slice(0, count);
  }

  private buildSafetySystemPrompt(mode: SafetyMode): string {
    const basePrompt = `You are a trust and safety reviewer for a mentorship platform.
Your job is to detect safety concerns, prioritize urgent cases, summarize risk clearly for admins, and give safe guidance for mentors.

Important rules:
- Flag self-harm, suicide, abuse, harassment, grooming, coercion, threats, and acute distress.
- If there is ambiguity around immediate danger, lean toward human review.
- Never shame the user or the mentor.
- Never give clinical diagnosis.
- Output valid JSON only. No markdown, no code fences, no extra commentary.

Return these fields:
- severity: one of LOW, MEDIUM, HIGH, CRITICAL
- priority: one of ROUTINE, PRIORITY, URGENT, IMMEDIATE
- crisisDetected: boolean
- flags: array of short strings
- summary: short neutral summary of what is happening
- adminSummary: concise admin-facing summary with escalation context
- escalationActions: array of concrete next steps for ops or moderation
- boundaries: array of safe boundary reminders for mentors
- mentorGuidance: array of supportive mentor actions or escalation steps
- confidence: number from 0 to 1
- needsHumanReview: boolean`;

    const modeGuidance =
      mode === "conversation"
        ? `
Focus on real-time conversation risk. Prioritize urgency, immediate danger, and whether the exchange should be escalated now.`
        : mode === "report"
        ? `
Focus on moderating a user report or incident summary. Make the adminSummary highly actionable and concise.`
        : `
Focus on mentor policy guidance. Emphasize safe boundaries, supportive language, escalation, and what the mentor should avoid saying.`;

    return `${basePrompt}${modeGuidance}`;
  }

  private buildSafetyUserPrompt(options: SafetyIntelligenceOptions): string {
    return `Mode: ${options.mode}
Subject: ${options.subject || "Not provided"}
Reporter: ${options.reporterName || "Not provided"}
Reported person: ${options.reportedName || "Not provided"}
Mentor: ${options.mentorName || "Not provided"}
Seeker: ${options.seekerName || "Not provided"}
Conversation history: ${options.conversationHistory?.join(" | ") || "Not provided"}
Additional context: ${options.extraContext?.join(" | ") || "Not provided"}

Content to review:
${options.content}

Return a single JSON object matching the requested schema.`;
  }

  private parseSafetyIntelligence(
    content: string,
    mode: SafetyMode
  ): SafetyIntelligenceResult {
    const fallback: SafetyIntelligenceResult = {
      mode,
      summary: "Unable to parse AI output.",
      adminSummary: "Human review recommended because the AI response could not be parsed.",
      severity: "HIGH",
      priority: "URGENT",
      crisisDetected: false,
      flags: ["parse_error"],
      escalationActions: ["Review the original conversation or report manually."],
      boundaries: ["Use supportive, non-judgmental language."] ,
      mentorGuidance: ["Escalate to a human moderator or safety reviewer."],
      confidence: 0,
      needsHumanReview: true,
    };

    try {
      const raw = this.extractJsonPayload(content);
      const parsed = JSON.parse(raw) as Partial<SafetyIntelligenceResult>;

      return {
        mode,
        summary: this.asNonEmptyString(parsed.summary, fallback.summary),
        adminSummary: this.asNonEmptyString(parsed.adminSummary, fallback.adminSummary),
        severity: this.asSafetySeverity(parsed.severity),
        priority: this.asSafetyPriority(parsed.priority),
        crisisDetected: Boolean(parsed.crisisDetected),
        flags: this.asStringArray(parsed.flags),
        escalationActions: this.asStringArray(parsed.escalationActions),
        boundaries: this.asStringArray(parsed.boundaries),
        mentorGuidance: this.asStringArray(parsed.mentorGuidance),
        confidence: this.asConfidence(parsed.confidence),
        needsHumanReview: Boolean(parsed.needsHumanReview),
      };
    } catch {
      return fallback;
    }
  }

  private extractJsonPayload(content: string): string {
    const trimmed = content.trim();

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      return fencedMatch[1].trim();
    }

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1);
    }

    return trimmed;
  }

  private asNonEmptyString(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private asSafetySeverity(value: unknown): SafetySeverity {
    const severity = typeof value === "string" ? value.toUpperCase() : "";
    if (severity === "LOW" || severity === "MEDIUM" || severity === "HIGH" || severity === "CRITICAL") {
      return severity;
    }

    return "HIGH";
  }

  private asSafetyPriority(value: unknown): SafetyPriority {
    const priority = typeof value === "string" ? value.toUpperCase() : "";
    if (priority === "ROUTINE" || priority === "PRIORITY" || priority === "URGENT" || priority === "IMMEDIATE") {
      return priority;
    }

    return "URGENT";
  }

  private asConfidence(value: unknown): number {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return 0.5;
    }

    return Math.min(1, Math.max(0, value));
  }

  /**
   * Parse conversation summary response
   */
  private parseConversationSummary(content: string): ConversationSummaryResult {
    const fallback: ConversationSummaryResult = {
      summaryForSeeker:
        "Thank you for this conversation. You showed openness to feedback and a genuine desire to grow.",
      summaryForMentor:
        "This seeker demonstrated commitment to their journey and receptivity to guidance.",
      keyThemes: ["growth", "resilience", "progress"],
      emotionalTone: "supportive",
    };

    try {
      const raw = this.extractJsonPayload(content);
      const parsed = JSON.parse(raw) as Partial<ConversationSummaryResult>;

      return {
        summaryForSeeker: this.asNonEmptyString(
          parsed.summaryForSeeker,
          fallback.summaryForSeeker
        ),
        summaryForMentor: this.asNonEmptyString(
          parsed.summaryForMentor,
          fallback.summaryForMentor
        ),
        keyThemes: this.asStringArray(parsed.keyThemes).slice(0, 4) || fallback.keyThemes,
        emotionalTone: this.asNonEmptyString(
          parsed.emotionalTone,
          fallback.emotionalTone
        ),
      };
    } catch {
      return fallback;
    }
  }

  /**
   * Parse action plan response
   */
  private parseActionPlan(content: string): ActionPlanResult {
    const fallback: ActionPlanResult = {
      actionItems: [
        {
          title: "Reflect on key insights",
          description: "Take time to process what was discussed in this conversation.",
          assignedTo: "SEEKER",
          priority: "MEDIUM",
          dueDate: "3 days",
        },
      ],
    };

    try {
      const raw = this.extractJsonPayload(content);
      const parsed = JSON.parse(raw) as Partial<ActionPlanResult>;

      if (
        Array.isArray(parsed.actionItems) &&
        parsed.actionItems.length > 0
      ) {
        return {
          actionItems: parsed.actionItems
            .slice(0, 5)
            .map((item) => ({
              title: this.asNonEmptyString(item?.title, "Action item"),
              description: this.asNonEmptyString(
                item?.description,
                "Complete this action"
              ),
              assignedTo:
                item?.assignedTo === "MENTOR" ? "MENTOR" : "SEEKER",
              priority:
                item?.priority === "HIGH" || item?.priority === "LOW"
                  ? item.priority
                  : "MEDIUM",
              dueDate: item?.dueDate,
            })) as ActionPlanResult["actionItems"],
        };
      }

      return fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Parse reflection prompts response
   */
  private parseReflectionPrompts(content: string): ReflectionPromptsResult {
    const fallback: ReflectionPromptsResult = {
      seekerPrompts: [
        "What was the most important thing you learned in this conversation?",
        "How can you apply this insight to your situation this week?",
      ],
      mentorPrompts: [
        "What was most meaningful about this mentorship exchange?",
        "How did you support their growth today?",
      ],
    };

    try {
      const raw = this.extractJsonPayload(content);
      const parsed = JSON.parse(raw) as Partial<ReflectionPromptsResult>;

      return {
        seekerPrompts: this.asStringArray(parsed.seekerPrompts).slice(0, 4) ||
          fallback.seekerPrompts,
        mentorPrompts: this.asStringArray(parsed.mentorPrompts).slice(0, 4) ||
          fallback.mentorPrompts,
      };
    } catch {
      return fallback;
    }
  }

  /**
   * Parse empathy drafting response
   */
  private parseEmpathyDrafting(content: string): EmpathyDraftingResult {
    const fallback: EmpathyDraftingResult = {
      draftResponses: [
        {
          response:
            "Thank you for sharing that with me. What you're experiencing is really significant, and I appreciate your honesty.",
          empathyElements: ["validation", "acknowledgment"],
          tone: "warm and understanding",
        },
      ],
    };

    try {
      const raw = this.extractJsonPayload(content);
      const parsed = JSON.parse(raw) as Partial<EmpathyDraftingResult>;

      if (
        Array.isArray(parsed.draftResponses) &&
        parsed.draftResponses.length > 0
      ) {
        return {
          draftResponses: parsed.draftResponses
            .slice(0, 3)
            .map((item) => ({
              response: this.asNonEmptyString(item?.response, "Response text"),
              empathyElements: this.asStringArray(item?.empathyElements),
              tone: this.asNonEmptyString(item?.tone, "warm"),
            })),
        };
      }

      return fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Parse follow-up questions response
   */
  private parseFollowUpQuestions(content: string): FollowUpQuestionsResult {
    const fallback: FollowUpQuestionsResult = {
      questions: [
        {
          question: "Can you tell me more about how that's affecting you?",
          purpose: "deepen understanding",
        },
        {
          question: "What would feel like a helpful first step?",
          purpose: "build agency",
        },
      ],
    };

    try {
      const raw = this.extractJsonPayload(content);
      const parsed = JSON.parse(raw) as Partial<FollowUpQuestionsResult>;

      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return {
          questions: parsed.questions
            .slice(0, 4)
            .map((item) => ({
              question: this.asNonEmptyString(item?.question, "Question"),
              purpose: this.asNonEmptyString(item?.purpose, "explore"),
            })),
        };
      }

      return fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Parse resource recommendations response
   */
  private parseResourceRecommendations(
    content: string
  ): ResourceRecommendationResult {
    const fallback: ResourceRecommendationResult = {
      resources: [
        {
          title: "Building Resilience Through Reflection",
          type: "article",
          description: "A guide to processing challenging experiences.",
          relevance: "HIGH",
        },
      ],
    };

    try {
      const raw = this.extractJsonPayload(content);
      const parsed = JSON.parse(raw) as Partial<ResourceRecommendationResult>;

      if (Array.isArray(parsed.resources) && parsed.resources.length > 0) {
        return {
          resources: parsed.resources
            .slice(0, 5)
            .map((item) => ({
              title: this.asNonEmptyString(item?.title, "Resource"),
              type: this.asResourceType(item?.type),
              description: this.asNonEmptyString(item?.description, "Description"),
              relevance:
                item?.relevance === "MEDIUM" ? "MEDIUM" : "HIGH",
              url: sanitizeOutputUrl(typeof item?.url === "string" ? item.url : undefined),
            })),
        };
      }

      return fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Parse boundary language check response
   */
  private parseBoundaryLanguageCheck(
    content: string
  ): BoundaryLanguageCheckResult {
    const fallback: BoundaryLanguageCheckResult = {
      isSafe: true,
      concerns: [],
      suggestions: [],
      overallFeedback: "This message appears to maintain healthy boundaries.",
    };

    try {
      const raw = this.extractJsonPayload(content);
      const parsed = JSON.parse(raw) as Partial<BoundaryLanguageCheckResult>;

      return {
        isSafe: Boolean(parsed.isSafe) !== false,
        concerns: this.asStringArray(parsed.concerns),
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions
              .slice(0, 5)
              .map((item) => ({
                original: this.asNonEmptyString(item?.original, "phrase"),
                suggested: this.asNonEmptyString(item?.suggested, "alternative"),
                reason: this.asNonEmptyString(item?.reason, "improvement"),
              }))
          : [],
        overallFeedback: this.asNonEmptyString(
          parsed.overallFeedback,
          fallback.overallFeedback
        ),
      };
    } catch {
      return fallback;
    }
  }

  private asResourceType(
    value: unknown
  ): "article" | "exercise" | "tool" | "book" | "video" {
    const type = typeof value === "string" ? value.toLowerCase() : "";
    if (
      type === "article" ||
      type === "exercise" ||
      type === "tool" ||
      type === "book" ||
      type === "video"
    ) {
      return type;
    }
    return "article";
  }
}

// Export singleton instance
export const aiService = new AIService();
export { AIService };
