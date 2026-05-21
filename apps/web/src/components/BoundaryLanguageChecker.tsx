"use client";

import React, { useState, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Shield, Loader2, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";

interface BoundarySuggestion {
  original: string;
  suggested: string;
  reason: string;
}

interface BoundaryCheckResult {
  isSafe: boolean;
  concerns: string[];
  suggestions: BoundarySuggestion[];
  overallFeedback: string;
}

interface BoundaryLanguageCheckerProps {
  conversationId: string;
  draftMessage: string;
  onUpdate?: (suggestion: BoundarySuggestion) => void;
}

export const BoundaryLanguageChecker: React.FC<BoundaryLanguageCheckerProps> = ({
  conversationId,
  draftMessage,
  onUpdate,
}) => {
  const user = useAuthStore((state) => state.user);
  const tier = user?.subscriptionTier || "FREE";
  if (tier === "FREE") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-emerald-700 font-medium">Boundary Language Checker is a Premium feature. <span className="underline cursor-pointer text-emerald-900">Upgrade to unlock</span>.</p>
      </div>
    );
  }
  const [result, setResult] = useState<BoundaryCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);

  const checkBoundaries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/mentor-copilot/boundary-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          draftMessage,
        }),
      });

      if (!response.ok) throw new Error("Failed to check boundaries");

      const data = await response.json();
      setResult(data);
      setIsExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error checking boundaries");
    } finally {
      setLoading(false);
    }
  }, [conversationId, draftMessage]);

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      {/* Toggle Button */}
      {!isExpanded && (
        <button
          onClick={() => {
            if (result === null && !loading) {
              checkBoundaries();
            } else {
              setIsExpanded(true);
            }
          }}
          disabled={loading}
          className="flex w-full items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <Shield className="h-4 w-4" />
          {loading ? "Checking boundaries..." : "Check boundary-safe language"}
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
            className="flex w-full items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <Shield className="h-4 w-4" />
            Boundary language check
            <ChevronUp className="h-4 w-4 ml-auto" />
          </button>

          {/* Error state */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {error}
              <button
                onClick={checkBoundaries}
                className="ml-2 font-medium hover:underline"
                disabled={loading}
              >
                {loading ? "Checking..." : "Try again"}
              </button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {/* Overall status */}
              <div
                className={clsx(
                  "rounded-lg p-3 flex items-start gap-3",
                  result.isSafe ? "bg-emerald-100" : "bg-amber-100"
                )}
              >
                {result.isSafe ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={clsx(
                      "text-sm font-medium",
                      result.isSafe ? "text-emerald-900" : "text-amber-900"
                    )}
                  >
                    {result.isSafe ? "Message appears safe" : "Boundary concerns detected"}
                  </p>
                  <p className={clsx("text-xs mt-1", result.isSafe ? "text-emerald-700" : "text-amber-700")}>
                    {result.overallFeedback}
                  </p>
                </div>
              </div>

              {/* Concerns list */}
              {result.concerns.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-stone-700">Concerns found:</p>
                  {result.concerns.map((concern, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-stone-600">
                      <span className="text-amber-600 mt-1">•</span>
                      <span>{concern}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-stone-700">Suggested improvements:</p>
                  {result.suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-emerald-100 bg-white p-2 space-y-2"
                    >
                      <button
                        onClick={() =>
                          setExpandedSuggestion(
                            expandedSuggestion === idx ? null : idx
                          )
                        }
                        className="w-full text-left flex items-start gap-2"
                      >
                        <ChevronDown
                          className={clsx(
                            "h-3 w-3 text-emerald-600 mt-0.5 transition-transform flex-shrink-0",
                            expandedSuggestion === idx && "rotate-180"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-stone-500 line-through">
                            {suggestion.original}
                          </p>
                          <p className="text-xs text-emerald-700 font-medium">
                            {suggestion.suggested}
                          </p>
                        </div>
                      </button>

                      {expandedSuggestion === idx && (
                        <div className="ml-5 pt-2 border-t border-emerald-100">
                          <p className="text-xs text-stone-600">
                            <strong>Why:</strong> {suggestion.reason}
                          </p>
                          {onUpdate && (
                            <button
                              onClick={() => onUpdate(suggestion)}
                              className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                            >
                              Apply suggestion
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Recheck button */}
              <button
                onClick={checkBoundaries}
                disabled={loading}
                className="w-full rounded-lg border border-emerald-200 bg-white text-emerald-700 text-xs font-medium py-2 hover:bg-emerald-50 transition-colors disabled:opacity-50"
              >
                {loading ? "Checking..." : "Check again"}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && result === null && !error && (
            <button
              onClick={checkBoundaries}
              className="w-full rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium py-3 hover:bg-emerald-200 transition-colors"
            >
              <Shield className="h-4 w-4 inline mr-2" />
              Check message for healthy boundaries
            </button>
          )}
        </div>
      )}
    </div>
  );
};
