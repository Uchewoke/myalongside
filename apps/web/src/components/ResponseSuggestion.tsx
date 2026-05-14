"use client";

import React, { useState, useCallback } from "react";
import { Sparkles, Loader2, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";

interface ResponseSuggestionProps {
  conversationId: string;
  seekerMessage: string;
  onSelect: (message: string) => void;
}

export const ResponseSuggestion: React.FC<ResponseSuggestionProps> = ({
  conversationId,
  seekerMessage,
  onSelect,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/suggestions/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messageContent: seekerMessage,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate suggestions");

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setIsExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generating suggestions");
    } finally {
      setLoading(false);
    }
  }, [conversationId, seekerMessage]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
      {/* Toggle Button */}
      {!isExpanded && (
        <button
          onClick={() => {
            if (suggestions.length === 0 && !loading) {
              generateSuggestions();
            } else {
              setIsExpanded(true);
            }
          }}
          disabled={loading}
          className="flex w-full items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          {loading ? "Generating suggestions..." : "Get suggestions to respond warmly"}
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin ml-auto" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-auto" />
          )}
        </button>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="space-y-3">
          {/* Header */}
          <button
            onClick={() => setIsExpanded(false)}
            className="flex w-full items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Response suggestions
            <ChevronUp className="h-4 w-4 ml-auto" />
          </button>

          {/* Suggestions List */}
          {error ? (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {error}
              <button
                onClick={generateSuggestions}
                className="ml-2 font-medium hover:underline"
              >
                Try again
              </button>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-brand-200 bg-white p-3 text-xs text-stone-700 hover:border-brand-300 transition-colors"
                >
                  <p className="mb-2 leading-relaxed">{suggestion}</p>
                  <div className="flex justify-between gap-2">
                    <button
                      onClick={() => handleCopy(suggestion, index)}
                      className="flex items-center gap-1 text-stone-500 hover:text-stone-700 transition-colors"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="h-3 w-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        onSelect(suggestion);
                        setIsExpanded(false);
                      }}
                      className="ml-auto text-brand-600 hover:text-brand-700 font-medium transition-colors"
                    >
                      Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
