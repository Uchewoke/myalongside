"use client";

import React, { useState, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Sparkles, Loader2, Copy, Check, ChevronDown, ChevronUp, Heart } from "lucide-react";
import clsx from "clsx";

interface EmpathyDraft {
  response: string;
  empathyElements: string[];
  tone: string;
}

interface EmpathyDraftingProps {
  conversationId: string;
  seekerMessage: string;
  onSelect: (message: string) => void;
}

export const EmpathyDrafting: React.FC<EmpathyDraftingProps> = ({
  conversationId,
  seekerMessage,
  onSelect,
}) => {
  const user = useAuthStore((state) => state.user);
  const tier = user?.subscriptionTier || "FREE";
  if (tier === "FREE") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
        <p className="text-amber-700 font-medium">Empathy Drafting is a Premium feature. <span className="underline cursor-pointer text-amber-900">Upgrade to unlock</span>.</p>
      </div>
    );
  }
  const [drafts, setDrafts] = useState<EmpathyDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/mentor-copilot/empathy-drafting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messageContent: seekerMessage,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate drafts");

      const data = await response.json();
      setDrafts(data.draftResponses || []);
      setIsExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generating drafts");
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
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      {/* Toggle Button */}
      {!isExpanded && (
        <button
          onClick={() => {
            if (drafts.length === 0 && !loading) {
              generateDrafts();
            } else {
              setIsExpanded(true);
            }
          }}
          disabled={loading}
          className="flex w-full items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors"
        >
          <Heart className="h-4 w-4" />
          {loading ? "Generating empathy drafts..." : "Draft with empathy guidance"}
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
            className="flex w-full items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors"
          >
            <Heart className="h-4 w-4" />
            Empathy-focused response drafts
            <ChevronUp className="h-4 w-4 ml-auto" />
          </button>

          {/* Error state */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {error}
              <button
                onClick={generateDrafts}
                className="ml-2 font-medium hover:underline"
                disabled={loading}
              >
                {loading ? "Generating..." : "Try again"}
              </button>
            </div>
          )}

          {/* Drafts List */}
          {drafts.length > 0 && (
            <div className="space-y-3">
              {drafts.map((draft, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-amber-100 bg-white p-3 space-y-2"
                >
                  {/* Draft content */}
                  <p className="text-sm text-stone-700 leading-relaxed">{draft.response}</p>

                  {/* Empathy elements badges */}
                  <div className="flex flex-wrap gap-1">
                    {draft.empathyElements.map((element, i) => (
                      <span
                        key={i}
                        className="inline-block text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full"
                      >
                        {element}
                      </span>
                    ))}
                  </div>

                  {/* Tone indicator */}
                  <p className="text-xs text-stone-500 italic">Tone: {draft.tone}</p>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => onSelect(draft.response)}
                      className="flex-1 rounded-lg bg-amber-600 text-white text-xs font-medium py-2 hover:bg-amber-700 transition-colors"
                    >
                      Use this draft
                    </button>
                    <button
                      onClick={() => handleCopy(draft.response, index)}
                      className="rounded-lg border border-amber-200 bg-white text-amber-700 p-2 hover:bg-amber-50 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {/* Regenerate button */}
              <button
                onClick={generateDrafts}
                disabled={loading}
                className="w-full rounded-lg border border-amber-200 bg-white text-amber-700 text-xs font-medium py-2 hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate new drafts"}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && drafts.length === 0 && !error && (
            <button
              onClick={generateDrafts}
              className="w-full rounded-lg bg-amber-100 text-amber-700 text-sm font-medium py-3 hover:bg-amber-200 transition-colors"
            >
              <Sparkles className="h-4 w-4 inline mr-2" />
              Generate empathy-focused drafts
            </button>
          )}
        </div>
      )}
    </div>
  );
};
