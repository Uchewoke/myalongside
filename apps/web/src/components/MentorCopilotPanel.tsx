"use client";

import React, { useState } from "react";
import { AlertCircle, Sparkles, X } from "lucide-react";
import { EmpathyDrafting } from "./EmpathyDrafting";
import { FollowUpQuestions } from "./FollowUpQuestions";
import { BoundaryLanguageChecker } from "./BoundaryLanguageChecker";
import { ResourceRecommendations } from "./ResourceRecommendations";
import clsx from "clsx";

interface MentorCopilotPanelProps {
  conversationId: string;
  seekerMessage: string;
  onMessageSelect: (message: string) => void;
  lifeEvent?: string;
  discussionTopics?: string[];
  seekerChallenges?: string[];
  isOpen: boolean;
  onClose: () => void;
}

export const MentorCopilotPanel: React.FC<MentorCopilotPanelProps> = ({
  conversationId,
  seekerMessage,
  onMessageSelect,
  lifeEvent = "mentorship",
  discussionTopics = [],
  seekerChallenges = [],
  isOpen,
  onClose,
}) => {
  const [draftMessage, setDraftMessage] = useState("");

  if (!isOpen) {
    return (
      <button
        onClick={() => !isOpen && (onClose === null || undefined)}
        className="fixed bottom-6 right-6 p-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg hover:shadow-xl transition-shadow"
        title="Open Mentor Copilot"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-lg overflow-y-auto z-40">
      {/* Header */}
      <div className="sticky top-0 border-b border-stone-200 bg-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h2 className="font-semibold text-stone-900">Mentor Copilot</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-stone-400" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Info banner */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            These tools help you respond with consistency, empathy, and healthy boundaries.
          </p>
        </div>

        {/* Empathy Drafting */}
        <div>
          <p className="text-xs font-semibold text-stone-600 mb-2 uppercase tracking-wide">
            1. Response Guidance
          </p>
          <EmpathyDrafting
            conversationId={conversationId}
            seekerMessage={seekerMessage}
            onSelect={(msg) => {
              setDraftMessage(msg);
              onMessageSelect(msg);
            }}
          />
        </div>

        {/* Follow-up Questions */}
        <div>
          <p className="text-xs font-semibold text-stone-600 mb-2 uppercase tracking-wide">
            2. Deepen the Conversation
          </p>
          <FollowUpQuestions
            conversationId={conversationId}
            seekerMessage={seekerMessage}
            onSelect={(question) => {
              const combined = draftMessage ? `${draftMessage}\n\n${question}` : question;
              setDraftMessage(combined);
              onMessageSelect(combined);
            }}
          />
        </div>

        {/* Resource Recommendations */}
        {(discussionTopics.length > 0 || seekerChallenges.length > 0) && (
          <div>
            <p className="text-xs font-semibold text-stone-600 mb-2 uppercase tracking-wide">
              3. Offer Resources
            </p>
            <ResourceRecommendations
              conversationId={conversationId}
              lifeEvent={lifeEvent}
              discussionTopics={discussionTopics}
              seekerChallenges={seekerChallenges}
            />
          </div>
        )}

        {/* Boundary Language Checker */}
        {draftMessage && (
          <div>
            <p className="text-xs font-semibold text-stone-600 mb-2 uppercase tracking-wide">
              4. Verify Boundaries
            </p>
            <BoundaryLanguageChecker
              conversationId={conversationId}
              draftMessage={draftMessage}
              onUpdate={(suggestion) => {
                const updated = draftMessage.replace(
                  suggestion.original,
                  suggestion.suggested
                );
                setDraftMessage(updated);
              }}
            />
          </div>
        )}

        {/* Draft preview */}
        {draftMessage && (
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-stone-700">Draft Message:</p>
            <p className="text-sm text-stone-700 leading-relaxed p-2 bg-white rounded border border-stone-200">
              {draftMessage}
            </p>
            <button
              onClick={() => {
                setDraftMessage("");
              }}
              className="text-xs text-stone-600 hover:text-stone-900 font-medium"
            >
              Clear draft
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
