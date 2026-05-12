export const LIFE_EVENTS = [
  {
    id: "divorce",
    label: "Divorce & Separation",
    emoji: "💔",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    bgGradient: "from-rose-500 to-pink-600",
    description: "Navigating the end of a marriage or long-term relationship",
  },
  {
    id: "job-loss",
    label: "Job Loss & Career",
    emoji: "💼",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    bgGradient: "from-orange-500 to-amber-600",
    description: "Redundancy, resignation, career pivots and rebuilding",
  },
  {
    id: "grief",
    label: "Grief & Bereavement",
    emoji: "🕊️",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    bgGradient: "from-slate-500 to-gray-600",
    description: "Losing a loved one and finding a path through grief",
  },
  {
    id: "health-crisis",
    label: "Health Crisis",
    emoji: "🏥",
    color: "bg-red-50 text-red-700 border-red-200",
    bgGradient: "from-red-500 to-rose-600",
    description: "Serious illness, diagnosis, and medical challenges",
  },
  {
    id: "new-parent",
    label: "New Parenthood",
    emoji: "👶",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    bgGradient: "from-yellow-400 to-amber-500",
    description: "The overwhelming joy and challenges of a new baby",
  },
  {
    id: "mental-health",
    label: "Mental Health",
    emoji: "🧠",
    color: "bg-violet-50 text-violet-700 border-violet-200",
    bgGradient: "from-violet-500 to-purple-600",
    description: "Anxiety, depression, burnout and emotional wellbeing",
  },
  {
    id: "addiction",
    label: "Addiction & Recovery",
    emoji: "🌱",
    color: "bg-green-50 text-green-700 border-green-200",
    bgGradient: "from-green-500 to-teal-600",
    description: "Recovery journeys and rebuilding a healthier life",
  },
  {
    id: "relocation",
    label: "Relocation & Moving",
    emoji: "🏠",
    color: "bg-sky-50 text-sky-700 border-sky-200",
    bgGradient: "from-sky-500 to-blue-600",
    description: "Moving cities, countries, and finding your footing",
  },
  {
    id: "financial",
    label: "Financial Crisis",
    emoji: "💰",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bgGradient: "from-emerald-500 to-teal-600",
    description: "Debt, bankruptcy, financial hardship and rebuilding",
  },
  {
    id: "empty-nest",
    label: "Empty Nest",
    emoji: "🪹",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    bgGradient: "from-teal-500 to-cyan-600",
    description: "Children leaving home and rediscovering your identity",
  },
  {
    id: "relationship",
    label: "Relationship Breakup",
    emoji: "💬",
    color: "bg-pink-50 text-pink-700 border-pink-200",
    bgGradient: "from-pink-500 to-rose-600",
    description: "Navigating heartbreak and rediscovering yourself",
  },
  {
    id: "fresh-start",
    label: "Fresh Start",
    emoji: "🌅",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    bgGradient: "from-amber-400 to-orange-500",
    description: "Major life reinvention and new beginnings",
  },
] as const;

export type LifeEventId = (typeof LIFE_EVENTS)[number]["id"];

export const MENTOR_AVAILABILITY = {
  AVAILABLE: { label: "Available Now", color: "bg-green-100 text-green-700" },
  BUSY: { label: "Limited Slots", color: "bg-amber-100 text-amber-700" },
  UNAVAILABLE: {
    label: "Not Available",
    color: "bg-stone-100 text-stone-500",
  },
};

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
