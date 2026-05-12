"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, CheckCircle } from "lucide-react";
import { LIFE_EVENTS } from "@/lib/constants";
import type { LifeEventId } from "@/lib/constants";
import { MOCK_MENTORS } from "@/lib/mock-data";
import MentorCard from "@/components/MentorCard";

const AVAILABILITY_OPTS = [
  { value: "", label: "Any" },
  { value: "AVAILABLE", label: "Available Now" },
  { value: "BUSY", label: "Limited Slots" },
];

export default function FindMentorPage() {
  const [query, setQuery] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<LifeEventId[]>([]);
  const [availability, setAvailability] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const toggleEvent = (id: LifeEventId) => {
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const filtered = useMemo(() => {
    return MOCK_MENTORS.filter((m) => {
      const matchesQuery =
        !query ||
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.tagline.toLowerCase().includes(query.toLowerCase()) ||
        (m.bio ?? "").toLowerCase().includes(query.toLowerCase());

      const matchesEvent =
        selectedEvents.length === 0 ||
        selectedEvents.some((e) => m.lifeEvents.includes(e));

      const matchesAvail =
        !availability || m.availability === availability;

      return matchesQuery && matchesEvent && matchesAvail;
    });
  }, [query, selectedEvents, availability]);

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
          Browse mentors who have personally lived through your life event.
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            placeholder="Search by name, event, or keyword…"
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

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          <span className="font-semibold text-stone-800">{filtered.length}</span>{" "}
          mentor{filtered.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Results grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((mentor) => (
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
