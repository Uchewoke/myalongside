"use client";

import React, { useState, useCallback } from "react";
import { Sparkles, X, Loader2, Copy, Check } from "lucide-react";
import clsx from "clsx";

interface DraftIntroModalProps {
  mentorName: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (message: string) => void;
  initialDraft: string;
  mentorId: string;
}

export const DraftIntroModal: React.FC<DraftIntroModalProps> = ({
  mentorName,
  isOpen,
  onClose,
  onSelect,
  initialDraft,
  mentorId,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const response = await fetch("/api/ai/suggestions/intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId,
          initialMessage: initialDraft,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate suggestions");

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generating suggestions");
    } finally {
      setLoading(false);
    }
  }, [mentorId, initialDraft]);

  React.useEffect(() => {
    if (isOpen && !suggestions.length && !loading) {
      generateSuggestions();
    }
  }, [isOpen, suggestions.length, loading, generateSuggestions]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-brand-600" />
            <h2 className="text-xl font-semibold text-stone-900">
              Draft Your First Message
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Subtitle */}
        <p className="mb-4 text-sm text-stone-600">
          Here are some ways to introduce yourself to {mentorName}. Feel free to customize any of these.
        </p>

        {/* Content */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            <span className="ml-2 text-sm text-stone-600">Generating suggestions...</span>
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button
              onClick={generateSuggestions}
              className="ml-2 font-medium text-red-800 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => setSelectedSuggestion(index)}
                className={clsx(
                  "cursor-pointer rounded-lg border-2 p-4 transition-all",
                  selectedSuggestion === index
                    ? "border-brand-500 bg-brand-50"
                    : "border-stone-200 bg-stone-50 hover:border-brand-300 hover:bg-brand-50/50"
                )}
              >
                <p className="mb-3 text-sm text-stone-800 leading-relaxed">
                  {suggestion}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(suggestion, index);
                    }}
                    className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 transition-colors"
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedSuggestion !== null) {
                onSelect(suggestions[selectedSuggestion]);
                onClose();
              }
            }}
            disabled={selectedSuggestion === null || loading}
            className="flex-1 rounded-lg bg-brand-gradient px-4 py-2.5 text-sm font-medium text-white shadow-glow hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Use This Message
          </button>
        </div>
      </div>
    </div>
  );
};
