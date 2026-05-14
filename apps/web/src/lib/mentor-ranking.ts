import type { LifeEventId } from "@/lib/constants";
import { MOCK_CURRENT_USER, MOCK_MENTORS, type MockUser } from "@/lib/mock-data";

const EVENT_ALIASES: Record<LifeEventId, string[]> = {
  divorce: ["divorce", "separation", "custody", "co-parenting", "children"],
  "job-loss": ["job loss", "laid off", "laid-off", "redundancy", "midlife", "career"],
  grief: ["grief", "bereavement", "widowed", "loss"],
  "health-crisis": ["health", "cancer", "breast cancer", "diagnosis", "treatment"],
  "new-parent": ["new parent", "newborn", "baby", "postpartum"],
  "mental-health": ["mental health", "anxiety", "depression", "burnout"],
  addiction: ["addiction", "recovery", "sober", "sobriety"],
  relocation: ["relocation", "moving", "new city", "new country"],
  financial: ["financial", "debt", "bankruptcy", "money"],
  "empty-nest": ["empty nest", "children left", "kids moved out"],
  relationship: ["breakup", "relationship", "heartbreak"],
  "fresh-start": ["fresh start", "reinvention", "starting over", "midlife"],
};

const STOP_WORDS = new Set([
  "i",
  "a",
  "an",
  "the",
  "and",
  "to",
  "of",
  "someone",
  "mentor",
  "want",
  "need",
  "who",
  "went",
  "through",
]);

export interface MentorSearchInterpretation {
  detectedLifeEvents: LifeEventId[];
  detectedLanguages: string[];
  detectedPreferences: string[];
}

export interface RankedMockMentor extends MockUser {
  matchScore: number;
  matchExplanation: string;
  matchedSignals: string[];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function interpretQuery(query: string): MentorSearchInterpretation {
  const normalized = normalize(query);

  const detectedLifeEvents = Object.entries(EVENT_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => normalized.includes(normalize(alias))))
    .map(([event]) => event as LifeEventId);

  const detectedLanguages = ["english", "spanish", "mandarin", "hindi", "tamil", "korean"]
    .filter((language) => normalized.includes(language));

  const detectedPreferences = ["woman", "female", "man", "male", "children", "kids", "midlife"]
    .filter((preference) => normalized.includes(preference));

  return { detectedLifeEvents, detectedLanguages, detectedPreferences };
}

function buildExplanation(name: string, signals: string[]): string {
  const reasons = signals.slice(0, 3);
  if (reasons.length === 0) {
    return `We recommended ${name} because their lived experience strongly overlaps with your profile.`;
  }
  if (reasons.length === 1) {
    return `We recommended ${name} because ${reasons[0]}.`;
  }
  if (reasons.length === 2) {
    return `We recommended ${name} because ${reasons[0]} and ${reasons[1]}.`;
  }
  return `We recommended ${name} because ${reasons[0]}, ${reasons[1]}, and ${reasons[2]}.`;
}

export function rankMockMentors(input: {
  query: string;
  selectedEvents: LifeEventId[];
  availability: string;
}): { mentors: RankedMockMentor[]; interpretation: MentorSearchInterpretation } {
  const interpretation = interpretQuery(input.query);
  const desiredEvents = unique([
    ...MOCK_CURRENT_USER.lifeEvents,
    ...input.selectedEvents,
    ...interpretation.detectedLifeEvents,
  ]);
  const desiredLanguages = unique([
    ...(MOCK_CURRENT_USER.languages ?? []),
    ...interpretation.detectedLanguages,
  ]);
  const queryTokens = tokenize(input.query);

  const mentors = MOCK_MENTORS.filter((mentor) => {
    if (!input.availability) {
      return true;
    }
    return mentor.availability === input.availability;
  })
    .map((mentor) => {
      const corpus = normalize(
        [
          mentor.name,
          mentor.tagline,
          mentor.bio ?? "",
          mentor.location ?? "",
          mentor.languages?.join(" ") ?? "",
          mentor.lifeEvents.join(" "),
          mentor.gender ?? "",
        ].join(" ")
      );

      const sharedEvents = desiredEvents.filter((event) => mentor.lifeEvents.includes(event));
      const sharedLanguages = desiredLanguages.filter((language) =>
        mentor.languages?.some((item) => item.toLowerCase() === language.toLowerCase())
      );
      const matchedTokens = queryTokens.filter((token) => corpus.includes(token));
      const preferenceSignals = interpretation.detectedPreferences.filter((preference) => {
        if ((preference === "woman" || preference === "female") && mentor.gender === "WOMAN") {
          return true;
        }
        if ((preference === "man" || preference === "male") && mentor.gender === "MAN") {
          return true;
        }
        if ((preference === "children" || preference === "kids") && corpus.includes("kids")) {
          return true;
        }
        if (preference === "midlife" && corpus.includes("42")) {
          return true;
        }
        return false;
      });

      const lifeEventFit = Math.min(35, sharedEvents.length * 18 + (sharedEvents.length > 0 ? 4 : 0));
      const contextSimilarity = Math.min(20, matchedTokens.length * 4 + preferenceSignals.length * 3);
      const languageScore = Math.min(10, sharedLanguages.length * 5);
      const availabilityScore = mentor.availability === "AVAILABLE" ? 15 : mentor.availability === "BUSY" ? 9 : 3;
      const rapport = Math.min(20, (mentor.rating ?? 0) * 2 + (mentor.isVerified ? 5 : 0));
      const matchScore = Math.min(
        100,
        Math.round(lifeEventFit + contextSimilarity + languageScore + availabilityScore + rapport)
      );

      const matchedSignals = unique([
        ...sharedEvents.map((event) => `they experienced ${event.replace(/-/g, " ")}`),
        ...sharedLanguages.map((language) => `they speak ${language}`),
        ...(mentor.availability === "AVAILABLE" ? ["they're available this week"] : []),
        ...preferenceSignals.map((signal) => `they match your ${signal} preference`),
        ...matchedTokens.slice(0, 2).map((token) => `their story matches your ${token} context`),
      ]);

      return {
        ...mentor,
        matchScore,
        matchedSignals,
        matchExplanation: buildExplanation(mentor.name, matchedSignals),
      };
    })
    .sort((left, right) => right.matchScore - left.matchScore);

  return { mentors, interpretation };
}