"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  ChevronDown,
  CheckCircle2,
  Clock,
  MessageCircle,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";
import { API_BASE } from "@/lib/constants";
import { useAuthStore } from "@/store/useAuthStore";

interface ConversationSummary {
  id: string;
  summaryForSeeker: string;
  summaryForMentor: string;
  keyThemes: string[];
  emotionalTone: string;
  personalSummary: string;
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
  dueDate?: Date;
  isMyAction: boolean;
  assigneeRole: "SEEKER" | "MENTOR";
}

interface ReflectionPrompt {
  id: string;
  prompt: string;
  response?: string;
  respondedAt?: Date;
}

interface ProgressSnapshot {
  id: string;
  conversationCount: number;
  totalActionItems: number;
  completedActions: number;
  engagementScore: number;
  progressNotes: string;
}

interface PostConversationModalProps {
  isOpen: boolean;
  conversationId: string;
  onClose: () => void;
  userName: string;
}

export function PostConversationModal({
  isOpen,
  conversationId,
  onClose,
  userName,
}: PostConversationModalProps) {
  const token = useAuthStore((state) => state.token);
  const [activeTab, setActiveTab] = useState<
    "summary" | "actions" | "reflection" | "progress"
  >("summary");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [reflectionPrompts, setReflectionPrompts] = useState<ReflectionPrompt[]>(
    []
  );
  const [progressSnapshot, setProgressSnapshot] =
    useState<ProgressSnapshot | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [reflectionResponses, setReflectionResponses] = useState<
    Record<string, string>
  >({});

  const loadPostConversationData = useCallback(async () => {
    if (!token || !conversationId) {
      setAuthError("Session expired. Please sign in again to load post-conversation insights.");
      setLoading(false);
      return;
    }

    setAuthError(null);
    setLoading(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      await fetch(`${API_BASE}/api/post-conversation/end-conversation`, {
        method: "POST",
        headers,
        body: JSON.stringify({ conversationId }),
      });

      const [summaryRes, actionPlanRes, reflectionRes, progressRes] =
        await Promise.all([
          fetch(`${API_BASE}/api/post-conversation/${conversationId}/summary`, {
            headers,
          }),
          fetch(`${API_BASE}/api/post-conversation/${conversationId}/action-plan`, {
            headers,
          }),
          fetch(
            `${API_BASE}/api/post-conversation/${conversationId}/reflection-prompts`,
            { headers }
          ),
          fetch(`${API_BASE}/api/post-conversation/${conversationId}/progress-snapshot`, {
            headers,
          }),
        ]);

      if (summaryRes.ok)
        setSummary(await summaryRes.json());
      if (actionPlanRes.ok)
        setActionItems(await actionPlanRes.json());
      if (reflectionRes.ok)
        setReflectionPrompts(await reflectionRes.json());
      if (progressRes.ok)
        setProgressSnapshot(await progressRes.json());

      const unauthorizedResponses = [
        summaryRes,
        actionPlanRes,
        reflectionRes,
        progressRes,
      ].some((res) => res.status === 401);
      if (unauthorizedResponses) {
        setAuthError("Session expired. Please sign in again to continue.");
      }
    } catch (error) {
      console.error("Error loading post-conversation data:", error);
    } finally {
      setLoading(false);
    }
  }, [token, conversationId]);

  useEffect(() => {
    if (isOpen && conversationId) {
      loadPostConversationData();
    }
  }, [isOpen, conversationId, loadPostConversationData]);

  const handleUpdateActionItem = async (
    actionItemId: string,
    newStatus: string
  ) => {
    try {
      if (!token) {
        setAuthError("Session expired. Please sign in again to update action items.");
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/post-conversation/${conversationId}/action-item/${actionItemId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.status === 401) {
        setAuthError("Session expired. Please sign in again to continue.");
        return;
      }

      if (response.ok) {
        const updated = await response.json();
        setActionItems((items) =>
          items.map((item) => (item.id === actionItemId ? updated : item))
        );
      }
    } catch (error) {
      console.error("Error updating action item:", error);
    }
  };

  const handleSubmitReflection = async (promptId: string) => {
    const response = reflectionResponses[promptId];
    if (!response?.trim()) return;

    try {
      if (!token) {
        setAuthError("Session expired. Please sign in again to submit reflection.");
        return;
      }

      const res = await fetch(
        `${API_BASE}/api/post-conversation/${conversationId}/reflection-response`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ promptId, response }),
        }
      );

      if (res.status === 401) {
        setAuthError("Session expired. Please sign in again to continue.");
        return;
      }

      if (res.ok) {
        const updated = await res.json();
        setReflectionPrompts((prompts) =>
          prompts.map((prompt) =>
            prompt.id === promptId ? updated : prompt
          )
        );
        setReflectionResponses((prev) => ({
          ...prev,
          [promptId]: "",
        }));
      }
    } catch (error) {
      console.error("Error submitting reflection:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              Turn This Into Momentum
            </h2>
            <p className="text-sm text-stone-600">
              Your personalized post-conversation insights
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-stone-200 px-6 pt-4">
          <TabButton
            icon={<MessageCircle className="h-4 w-4" />}
            label="Summary"
            active={activeTab === "summary"}
            onClick={() => setActiveTab("summary")}
          />
          <TabButton
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Action Plan"
            active={activeTab === "actions"}
            onClick={() => setActiveTab("actions")}
            badge={actionItems.length}
          />
          <TabButton
            icon={<Lightbulb className="h-4 w-4" />}
            label="Reflection"
            active={activeTab === "reflection"}
            onClick={() => setActiveTab("reflection")}
          />
          <TabButton
            icon={<TrendingUp className="h-4 w-4" />}
            label="Progress"
            active={activeTab === "progress"}
            onClick={() => setActiveTab("progress")}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {authError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {authError}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-8 w-8 rounded-full border-4 border-stone-200 border-t-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-stone-600">Loading your insights...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Tab */}
              {activeTab === "summary" && summary && (
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                    <h3 className="font-semibold text-blue-900 mb-3">
                      Your Personalized Summary
                    </h3>
                    <p className="text-blue-800 leading-relaxed">
                      {summary.personalSummary}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-stone-900 mb-3">
                      Key Discussion Themes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {summary.keyThemes.map((theme) => (
                        <span
                          key={theme}
                          className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700"
                        >
                          <span className="h-2 w-2 rounded-full bg-stone-400" />
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-stone-900 mb-2">
                      Conversation Tone
                    </h4>
                    <p className="text-stone-700 capitalize">
                      {summary.emotionalTone}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Plan Tab */}
              {activeTab === "actions" && (
                <div className="space-y-4">
                  {actionItems.length === 0 ? (
                    <div className="text-center py-8 text-stone-500">
                      <p>No action items identified for this conversation</p>
                    </div>
                  ) : (
                    actionItems.map((item) => (
                      <ActionItemCard
                        key={item.id}
                        item={item}
                        onStatusChange={handleUpdateActionItem}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Reflection Tab */}
              {activeTab === "reflection" && (
                <div className="space-y-6">
                  {reflectionPrompts.length === 0 ? (
                    <div className="text-center py-8 text-stone-500">
                      <p>No reflection prompts available</p>
                    </div>
                  ) : (
                    reflectionPrompts.map((prompt) => (
                      <ReflectionPromptCard
                        key={prompt.id}
                        prompt={prompt}
                        response={reflectionResponses[prompt.id] || ""}
                        onResponseChange={(text) =>
                          setReflectionResponses((prev) => ({
                            ...prev,
                            [prompt.id]: text,
                          }))
                        }
                        onSubmit={handleSubmitReflection}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Progress Tab */}
              {activeTab === "progress" && progressSnapshot && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <ProgressCard
                      label="Total Conversations"
                      value={progressSnapshot.conversationCount}
                      icon={<MessageCircle className="h-5 w-5" />}
                    />
                    <ProgressCard
                      label="Action Items"
                      value={progressSnapshot.totalActionItems}
                      icon={<CheckCircle2 className="h-5 w-5" />}
                    />
                  </div>

                  <div>
                    <h4 className="font-semibold text-stone-900 mb-3">
                      Engagement Score
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-end gap-3">
                        <div className="text-4xl font-bold text-blue-600">
                          {progressSnapshot.engagementScore}%
                        </div>
                        <p className="text-stone-600 mb-2">
                          Growing with each conversation
                        </p>
                      </div>
                      <div className="w-full bg-stone-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                          style={{
                            width: `${progressSnapshot.engagementScore}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                    <p className="text-green-900">
                      {progressSnapshot.progressNotes}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

function TabButton({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-stone-600 hover:text-stone-900"
      )}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && (
        <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-white text-xs font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

function ActionItemCard({
  item,
  onStatusChange,
}: {
  item: ActionItem;
  onStatusChange: (id: string, status: string) => void;
}) {
  const statusOptions = [
    { value: "PENDING", label: "Pending" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "SKIPPED", label: "Skipped" },
  ];

  const statusColors = {
    PENDING: "bg-stone-100 text-stone-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    SKIPPED: "bg-stone-200 text-stone-500",
  };

  const priorityColors = {
    HIGH: "text-red-600",
    MEDIUM: "text-yellow-600",
    LOW: "text-green-600",
  };

  return (
    <div className="rounded-lg border border-stone-200 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-stone-900 mb-1">{item.title}</h4>
          <p className="text-sm text-stone-600 mb-2">{item.description}</p>
          <div className="flex items-center gap-3 text-xs">
            <span
              className={clsx(
                "font-medium",
                priorityColors[item.priority]
              )}
            >
              {item.priority} Priority
            </span>
            {item.dueDate && (
              <span className="flex items-center gap-1 text-stone-500">
                <Clock className="h-3 w-3" />
                {new Date(item.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {item.isMyAction && (
        <div className="flex items-center justify-between pt-3 border-t border-stone-100">
          <span className="text-xs font-medium text-stone-600">
            Assigned to you
          </span>
          <select
            value={item.status}
            onChange={(e) => onStatusChange(item.id, e.target.value)}
            className={clsx(
              "text-xs font-medium px-2.5 py-1.5 rounded-md border-0 transition-colors",
              statusColors[item.status]
            )}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function ReflectionPromptCard({
  prompt,
  response,
  onResponseChange,
  onSubmit,
}: {
  prompt: ReflectionPrompt;
  response: string;
  onResponseChange: (text: string) => void;
  onSubmit: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-stone-200 p-4 space-y-3">
      <h4 className="font-semibold text-stone-900">{prompt.prompt}</h4>

      {prompt.response ? (
        <div className="bg-stone-50 rounded p-3">
          <p className="text-sm text-stone-700">{prompt.response}</p>
          <p className="text-xs text-stone-500 mt-2">
            Reflected on {new Date(prompt.respondedAt!).toLocaleDateString()}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={response}
            onChange={(e) => onResponseChange(e.target.value)}
            placeholder="Take a moment to reflect..."
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
          <button
            onClick={() => onSubmit(prompt.id)}
            disabled={!response.trim()}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 rounded-lg transition-colors"
          >
            Save Reflection
          </button>
        </div>
      )}
    </div>
  );
}

function ProgressCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-stone-200 p-4 text-center">
      <div className="flex items-center justify-center mb-3 text-blue-600">
        {icon}
      </div>
      <div className="text-3xl font-bold text-stone-900 mb-1">{value}</div>
      <p className="text-sm text-stone-600">{label}</p>
    </div>
  );
}
