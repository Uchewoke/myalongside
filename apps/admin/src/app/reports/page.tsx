"use client";

import { useEffect, useMemo, useState } from "react";

const reports = [
  {
    id: "rep_101",
    against: "u_88",
    reporter: "u_14",
    reason: "Harassment",
    details: "Repeated hostile messages, pressure to respond immediately, and insulting language after boundaries were set.",
    status: "OPEN",
    priority: "HIGH",
    createdAt: "2025-03-10",
  },
  {
    id: "rep_102",
    against: "u_19",
    reporter: "u_32",
    reason: "Unsafe Advice",
    details: "Mentor pushed the seeker to stop medication and ignore their care team during a stress-related crisis.",
    status: "REVIEWING",
    priority: "MEDIUM",
    createdAt: "2025-03-11",
  },
  {
    id: "rep_103",
    against: "u_42",
    reporter: "u_07",
    reason: "Spam",
    details: "Unsolicited repetitive outreach across multiple conversations with promotional content.",
    status: "RESOLVED",
    priority: "LOW",
    createdAt: "2025-03-11",
  },
];

type SafetyIntelligence = {
  summary: string;
  adminSummary: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  priority: "ROUTINE" | "PRIORITY" | "URGENT" | "IMMEDIATE";
  crisisDetected: boolean;
  flags: string[];
  escalationActions: string[];
  boundaries: string[];
  mentorGuidance: string[];
  confidence: number;
  needsHumanReview: boolean;
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

function severityClasses(severity: SafetyIntelligence["severity"]) {
  if (severity === "CRITICAL") return "bg-rose-100 text-rose-800 ring-rose-200";
  if (severity === "HIGH") return "bg-orange-100 text-orange-800 ring-orange-200";
  if (severity === "MEDIUM") return "bg-amber-100 text-amber-800 ring-amber-200";
  return "bg-emerald-100 text-emerald-800 ring-emerald-200";
}

function priorityClasses(priority: SafetyIntelligence["priority"]) {
  if (priority === "IMMEDIATE") return "bg-rose-600 text-white";
  if (priority === "URGENT") return "bg-orange-600 text-white";
  if (priority === "PRIORITY") return "bg-amber-600 text-white";
  return "bg-emerald-600 text-white";
}

export default function AdminReportsPage() {
  const [insights, setInsights] = useState<Record<string, SafetyIntelligence>>({});
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const reportCount = useMemo(() => reports.length, []);

  useEffect(() => {
    let active = true;

    async function loadInsights() {
      setLoading(true);

      const settled = await Promise.allSettled(
        reports.map(async (report) => {
          const response = await fetch(`/api/safety/intelligence`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              mode: "report",
              subject: report.reason,
              reporterName: report.reporter,
              reportedName: report.against,
              content: `Report ID: ${report.id}\nReason: ${report.reason}\nStatus: ${report.status}\nPriority: ${report.priority}\nCreated: ${report.createdAt}\nDetails: ${report.details}`,
              extraContext: [
                `Current queue status: ${report.status}`,
                `Operational priority: ${report.priority}`,
              ],
            }),
          });

          if (response.status === 401 || response.status === 403) {
            throw new Error("access_denied");
          }

          if (!response.ok) {
            throw new Error(`Failed to load insight for ${report.id}`);
          }

          return [report.id, (await response.json()) as SafetyIntelligence] as const;
        })
      );

      if (!active) {
        return;
      }

      const nextInsights: Record<string, SafetyIntelligence> = {};
      for (const item of settled) {
        if (item.status === "fulfilled") {
          const [id, insight] = item.value;
          nextInsights[id] = insight;
        }
      }

      setInsights(nextInsights);
      setLoading(false);

      if (Object.keys(nextInsights).length === 0 && settled.some((item) => item.status === "rejected")) {
        setAccessDenied(settled.some((item) => item.status === "rejected" && item.reason instanceof Error && item.reason.message === "access_denied"));
      }
    }

    void loadInsights();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/40 p-8 md:p-10">
      <header className="max-w-6xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-rose-700">Safety Intelligence</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950 md:text-4xl">Moderation reports with AI triage</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Review incidents, surface crisis signals, and route urgent cases faster with automatic risk summaries and policy guidance.
        </p>
        {accessDenied ? (
          <p className="mt-3 inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 ring-1 ring-rose-200">
            Admin authentication required to view safety intelligence.
          </p>
        ) : null}
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Reports in queue</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{reportCount}</p>
        </article>
        <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">AI status</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{loading ? "Scanning" : "Live"}</p>
        </article>
        <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Escalation mode</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">Priority routing</p>
        </article>
      </section>

      <div className="mt-6 space-y-4">
        {reports.map((report) => {
          const insight = insights[report.id];

          return (
            <article key={report.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{report.id}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-950">{report.reason}</h2>
                    {insight ? (
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${severityClasses(insight.severity)}`}>
                        {insight.severity} severity
                      </span>
                    ) : null}
                    {insight ? (
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityClasses(insight.priority)}`}>
                        {insight.priority} priority
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Reporter {report.reporter} flagged {report.against} · {report.status} · {report.createdAt}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{report.status}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      report.priority === "HIGH"
                        ? "bg-rose-100 text-rose-700"
                        : report.priority === "MEDIUM"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {report.priority}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-700">{report.details}</p>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">AI moderation summary</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {insight ? insight.adminSummary : accessDenied ? "Sign in as an admin to load moderation intelligence." : loading ? "Loading triage..." : "No summary available."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(insight?.flags || []).map((flag) => (
                      <span key={flag} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                        {flag}
                      </span>
                    ))}
                    {insight?.crisisDetected ? (
                      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Crisis detected</span>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
                  <p className="text-sm font-semibold text-rose-950">Escalation actions</p>
                  <ul className="mt-2 space-y-2 text-sm text-rose-900">
                    {(insight?.escalationActions?.length ? insight.escalationActions : ["Review the case and assign a human moderator."]).map((action) => (
                      <li key={action} className="rounded-xl bg-white/80 px-3 py-2 ring-1 ring-rose-100">
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                  <p className="text-sm font-semibold text-amber-950">Mentor policy guidance</p>
                  <ul className="mt-2 space-y-2 text-sm text-amber-950/90">
                    {(insight?.mentorGuidance?.length ? insight.mentorGuidance : ["Use a supportive tone and escalate if risk is unclear."]).map((item) => (
                      <li key={item} className="rounded-xl bg-white/75 px-3 py-2 ring-1 ring-amber-100">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">Conversation review</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {insight?.summary || "AI triage surfaces risk level, summary, and route-to-human cues in one place."}
                  </p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    Confidence {(insight ? Math.round(insight.confidence * 100) : 0)}% · Human review {insight?.needsHumanReview ? "recommended" : "optional"}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
