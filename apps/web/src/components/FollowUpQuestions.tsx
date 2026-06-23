"use client";

import React, { useState, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Sparkles, Loader2, Copy, Check, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import clsx from "clsx";

interface FollowUpQuestion {
  question: string;
  purpose: string;
}

interface FollowUpQuestionsProps {
  conversationId: string;
  seekerMessage: string;
  onSelect: (question: string) => void;
}

export const FollowUpQuestions: React.FC<FollowUpQuestionsProps> = ({
  conversationId,
  seekerMessage,
  onSelect,
}) => {
  const user = useAuthStore((state) => state.user);
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const tier = user?.subscriptionTier || "FREE";

  const generateQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/mentor-copilot/follow-up-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messageContent: seekerMessage,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate questions");

      const data = await response.json();
      setQuestions(data.questions || []);
      setIsExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generating questions");
    } finally {
      setLoading(false);
    }
  }, [conversationId, seekerMessage]);

  if (tier === "FREE") {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
        <p className="text-blue-700 font-medium">Follow-up Questions are a Plus feature. <span className="underline cursor-pointer text-blue-900">Upgrade to unlock</span>.</p>
      </div>
    );
  }

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      {/* Toggle Button */}
      {!isExpanded && (
        <button
          onClick={() => {
            if (questions.length === 0 && !loading) {
              generateQuestions();
            } else {
              setIsExpanded(true);
            }
          }}
          disabled={loading}
          className="flex w-full items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          {loading ? "Generating follow-up questions..." : "Suggest follow-up questions"}
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
            className="flex w-full items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            Follow-up questions to deepen conversation
            <ChevronUp className="h-4 w-4 ml-auto" />
          </button>

          {/* Error state */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {error}
              <button
                onClick={generateQuestions}
                className="ml-2 font-medium hover:underline"
                disabled={loading}
              >
                {loading ? "Generating..." : "Try again"}
              </button>
            </div>
          )}

          {/* Questions List */}
          {questions.length > 0 && (
            <div className="space-y-2">
              {questions.map((item, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-blue-100 bg-white p-3 space-y-2"
                >
                  {/* Question */}
                  <p className="text-sm text-stone-700 font-medium">&ldquo;{item.question}&rdquo;</p>

                  {/* Purpose */}
                  <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                    Purpose: {item.purpose}
                  </p>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => onSelect(item.question)}
                      className="flex-1 rounded-lg bg-blue-600 text-white text-xs font-medium py-2 hover:bg-blue-700 transition-colors"
                    >
                      Use this question
                    </button>
                    <button
                      onClick={() => handleCopy(item.question, index)}
                      className="rounded-lg border border-blue-200 bg-white text-blue-700 p-2 hover:bg-blue-50 transition-colors"
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
                onClick={generateQuestions}
                disabled={loading}
                className="w-full rounded-lg border border-blue-200 bg-white text-blue-700 text-xs font-medium py-2 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate new questions"}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && questions.length === 0 && !error && (
            <button
              onClick={generateQuestions}
              className="w-full rounded-lg bg-blue-100 text-blue-700 text-sm font-medium py-3 hover:bg-blue-200 transition-colors"
            >
              <Sparkles className="h-4 w-4 inline mr-2" />
              Generate contextual follow-up questions
            </button>
          )}
        </div>
      )}
    </div>
  );
};
