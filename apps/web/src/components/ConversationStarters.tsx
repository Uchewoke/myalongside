"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, MessageCircle } from "lucide-react";

interface ConversationStartersProps {
  lifeEventId: string;
  onSelect: (starter: string) => void;
}

export const ConversationStarters: React.FC<ConversationStartersProps> = ({
  lifeEventId,
  onSelect,
}) => {
  const [starters, setStarters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStarters = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ai/suggestions/starters?lifeEventId=${encodeURIComponent(lifeEventId)}`,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch starters");

      const data = await response.json();
      setStarters(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading suggestions");
    } finally {
      setLoading(false);
    }
  }, [lifeEventId]);

  useEffect(() => {
    fetchStarters();
  }, [fetchStarters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-brand-600 mr-2" />
        <span className="text-sm text-stone-600">Loading conversation starters...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
        {error}
        <button
          onClick={fetchStarters}
          className="ml-2 font-medium hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (starters.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <p className="text-sm font-medium text-stone-700">
          Ways to get the conversation started:
        </p>
      </div>

      {/* Starters */}
      <div className="space-y-2">
        {starters.map((starter, index) => (
          <button
            key={index}
            onClick={() => onSelect(starter)}
            className="flex w-full items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-left transition-all hover:border-brand-300 hover:bg-brand-50"
          >
            <MessageCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-brand-600" />
            <span className="text-xs text-stone-700 leading-relaxed">
              {starter}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
