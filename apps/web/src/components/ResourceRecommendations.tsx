"use client";

import React, { useState, useCallback } from "react";
import { Sparkles, Loader2, ExternalLink, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import clsx from "clsx";

interface Resource {
  title: string;
  type: "article" | "exercise" | "tool" | "book" | "video";
  description: string;
  relevance: "HIGH" | "MEDIUM";
  url?: string;
}

interface ResourceRecommendationsProps {
  conversationId: string;
  lifeEvent: string;
  discussionTopics: string[];
  seekerChallenges: string[];
}

const resourceTypeIcons: Record<string, string> = {
  article: "📰",
  exercise: "🧘",
  tool: "🛠️",
  book: "📚",
  video: "🎬",
};

const resourceTypeLabels: Record<string, string> = {
  article: "Article",
  exercise: "Exercise",
  tool: "Tool",
  book: "Book",
  video: "Video",
};

export const ResourceRecommendations: React.FC<ResourceRecommendationsProps> = ({
  conversationId,
  lifeEvent,
  discussionTopics,
  seekerChallenges,
}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const generateRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/mentor-copilot/resource-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          lifeEvent,
          discussionTopics,
          seekerChallenges,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate recommendations");

      const data = await response.json();
      setResources(data.resources || []);
      setIsExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generating recommendations");
    } finally {
      setLoading(false);
    }
  }, [conversationId, lifeEvent, discussionTopics, seekerChallenges]);

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
      {/* Toggle Button */}
      {!isExpanded && (
        <button
          onClick={() => {
            if (resources.length === 0 && !loading) {
              generateRecommendations();
            } else {
              setIsExpanded(true);
            }
          }}
          disabled={loading}
          className="flex w-full items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-800 transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          {loading ? "Finding resources..." : "Suggest helpful resources"}
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
            className="flex w-full items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-800 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            Recommended resources for support
            <ChevronUp className="h-4 w-4 ml-auto" />
          </button>

          {/* Error state */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {error}
              <button
                onClick={generateRecommendations}
                className="ml-2 font-medium hover:underline"
                disabled={loading}
              >
                {loading ? "Generating..." : "Try again"}
              </button>
            </div>
          )}

          {/* Resources List */}
          {resources.length > 0 && (
            <div className="space-y-2">
              {resources.map((resource, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-purple-100 bg-white p-3 space-y-2"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{resourceTypeIcons[resource.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900">
                        {resource.title}
                      </p>
                      <p className="text-xs text-purple-600 mt-0.5">
                        {resourceTypeLabels[resource.type]}
                      </p>
                    </div>
                    {resource.relevance === "HIGH" && (
                      <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-full flex-shrink-0">
                        Highly relevant
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {resource.description}
                  </p>

                  {/* Action button */}
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      View resource <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}

              {/* Regenerate button */}
              <button
                onClick={generateRecommendations}
                disabled={loading}
                className="w-full rounded-lg border border-purple-200 bg-white text-purple-700 text-xs font-medium py-2 hover:bg-purple-50 transition-colors disabled:opacity-50"
              >
                {loading ? "Generating..." : "Find different resources"}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && resources.length === 0 && !error && (
            <button
              onClick={generateRecommendations}
              className="w-full rounded-lg bg-purple-100 text-purple-700 text-sm font-medium py-3 hover:bg-purple-200 transition-colors"
            >
              <Sparkles className="h-4 w-4 inline mr-2" />
              Generate resource recommendations
            </button>
          )}
        </div>
      )}
    </div>
  );
};
