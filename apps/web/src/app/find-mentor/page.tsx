"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { Search, SlidersHorizontal, X, CheckCircle, Sparkles } from "lucide-react";
import { API_BASE, LIFE_EVENTS } from "@/lib/constants";
import type { LifeEventId } from "@/lib/constants";
import type { MockUser } from "@/lib/mock-data";
import MentorCard from "@/components/MentorCard";
import { useAuthStore } from "@/store/useAuthStore";
import { rankMockMentors } from "@/lib/mentor-ranking";

const AVAILABILITY_OPTS = [
  { value: "", label: "Any" },
  { value: "AVAILABLE", label: "Available Now" },
  { value: "BUSY", label: "Limited Slots" },
];

interface SearchInterpretation {
  detectedLifeEvents: string[];
  detectedLanguages: string[];
  detectedTone?: string[];
  detectedPreferences?: string[];
}

export default function FindMentorPage() {
  const [query, setQuery] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<LifeEventId[]>([]);
  const [availability, setAvailability] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [mentors, setMentors] = useState<MockUser[]>([]);
  const [interpretation, setInterpretation] = useState<SearchInterpretation>({
    detectedLifeEvents: [],
    detectedLanguages: [],
    detectedPreferences: [],
  });
  const [loading, setLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const token = useAuthStore((state) => state.token);
  const deferredQuery = useDeferredValue(query);

  const toggleEvent = (id: LifeEventId) => {
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    let cancelled = false;

    async function loadRankedMentors() {
      setLoading(true);

      const applyFallback = () => {
        const fallback = rankMockMentors({
          query: deferredQuery,
          selectedEvents,
          availability,
        });

        if (!cancelled) {
          setMentors(fallback.mentors);
          setInterpretation(fallback.interpretation);
          setUsingFallback(true);
          setLoading(false);
        }
      };

      if (!token) {
        applyFallback();
        return;
      }

      try {
        const params = new URLSearchParams();
        if (deferredQuery.trim()) {
          params.set("q", deferredQuery.trim());
        }
        if (selectedEvents.length > 0) {
          params.set("lifeEvents", selectedEvents.join(","));
        }
        if (availability === "AVAILABLE") {
          params.set("availability", "AVAILABLE");
        }
        params.set("limit", "12");

        const response = await fetch(`${API_BASE}/api/mentors/search?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          applyFallback();
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setMentors(
            (data.mentors ?? []).map((mentor: any) => ({
              id: mentor.id,
              name: mentor.name,
              avatar:
                mentor.avatar ??
                `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(mentor.name)}&backgroundColor=b6e3f4`,
              role: "MENTOR",
              tagline: mentor.tagline ?? "Lived experience mentor",
              lifeEvents: (mentor.lifeEvents ?? [])
                .map((event: { slug: string }) => event.slug)
                .filter(Boolean),
              yearsExperience: mentor.yearsExperience ?? undefined,
              rating: mentor.rating ?? undefined,
              reviewCount: mentor.reviewCount ?? undefined,
              isVerified: mentor.isVerified,
              availability: mentor.isAvailable ? "AVAILABLE" : "UNAVAILABLE",
              bio: mentor.bio ?? undefined,
              location: mentor.location ?? undefined,
              languages: mentor.languages ?? [],
              matchScore: mentor.matchScore,
              matchExplanation: mentor.matchExplanation,
              matchedSignals: mentor.matchedSignals,
            }))
          );
          setInterpretation(data.interpretation ?? { detectedLifeEvents: [], detectedLanguages: [] });
          setUsingFallback(false);
          setLoading(false);
        }
      } catch {
        applyFallback();
      }
    }

    loadRankedMentors();

    return () => {
      cancelled = true;
    };
  }, [availability, deferredQuery, selectedEvents, token]);

  const clearFilters = () => {
    setQuery("");
    setSelectedEvents([]);
    setAvailability("");
  };

  const hasFilters = query || selectedEvents.length > 0 || availability;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="section-label">Mentor Directory</p>
        <h1 className="mt-1 text-2xl font-extrabold text-stone-900">
          Find Your Mentor
        </h1>
        <p className="mt-1.5 text-sm text-stone-500">
          Search naturally and get mentors ranked by lived experience, context fit, tone, language, and availability.
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            placeholder="Try: I want someone who survived job loss in midlife"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary gap-2 ${showFilters ? "!border-brand-400 !text-brand-700 !bg-brand-50" : ""}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {selectedEvents.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] text-white">
              {selectedEvents.length}
            </span>
          )}
        </button>

        {hasFilters && (
          <button onClick={clearFilters} className="btn-ghost text-stone-400">
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="card p-5 space-y-5">
          {/* Availability */}
          <div>
            <p className="mb-2.5 text-sm font-semibold text-stone-700">Availability</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_OPTS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setAvailability(value)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                    availability === value
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Life events */}
          <div>
            <p className="mb-2.5 text-sm font-semibold text-stone-700">Life Event</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {LIFE_EVENTS.map((event) => {
                const selected = selectedEvents.includes(event.id);
                return (
                  <button
                    key={event.id}
                    onClick={() => toggleEvent(event.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                      selected
                        ? `${event.color} font-semibold`
                        : "border-stone-200 text-stone-500 hover:border-stone-300"
                    }`}
                  >
                    <span>{event.emoji}</span>
                    <span className="flex-1 leading-tight">{event.label}</span>
                    {selected && <CheckCircle className="h-3 w-3 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {selectedEvents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEvents.map((id) => {
            const e = LIFE_EVENTS.find((x) => x.id === id);
            return e ? (
              <button
                key={id}
                onClick={() => toggleEvent(id)}
                className={`badge border gap-2 ${e.color}`}
              >
                {e.emoji} {e.label}
                <X className="h-3 w-3" />
              </button>
            ) : null;
          })}
        </div>
      )}

      <div className="card overflow-hidden border-brand-100 bg-gradient-to-br from-brand-50 via-white to-amber-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-brand-700">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">AI Ranking Signals</p>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
              Results are ranked by life-event fit, context similarity, language overlap, mentor tone, current availability, and likely rapport.
            </p>
          </div>
          <div className="text-xs text-stone-500">
            {usingFallback
              ? "Using local AI-style ranking preview"
              : "Using live ranked mentor search"}
          </div>
        </div>
        {(interpretation.detectedLifeEvents.length > 0 ||
          interpretation.detectedLanguages.length > 0 ||
          (interpretation.detectedPreferences?.length ?? 0) > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {interpretation.detectedLifeEvents.map((eventId) => {
              const event = LIFE_EVENTS.find((item) => item.id === eventId);
              return event ? (
                <span key={event.id} className={`badge border ${event.color}`}>
                  {event.emoji} {event.label}
                </span>
              ) : null;
            })}
            {interpretation.detectedLanguages.map((language) => (
              <span key={language} className="badge border border-sky-200 bg-sky-50 text-sky-700">
                Language: {language}
              </span>
            ))}
            {(interpretation.detectedPreferences ?? []).map((preference) => (
              <span
                key={preference}
                className="badge border border-stone-200 bg-white text-stone-600"
              >
                Preference: {preference}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          <span className="font-semibold text-stone-800">{mentors.length}</span>{" "}
          mentor{mentors.length !== 1 ? "s" : ""} ranked
        </p>
        {loading && <p className="text-xs text-stone-400">Refreshing ranked matches…</p>}
      </div>

      {/* Results grid */}
      {mentors.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {mentors.map((mentor) => (
            <MentorCard key={mentor.id} mentor={mentor} />
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center py-16 text-center">
          <div className="mb-4 text-5xl">🔍</div>
          <h3 className="font-bold text-stone-900">No mentors found</h3>
          <p className="mt-2 max-w-sm text-sm text-stone-500">
            Try adjusting your filters or searching for a different keyword.
          </p>
          <button onClick={clearFilters} className="btn-primary mt-4">
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
