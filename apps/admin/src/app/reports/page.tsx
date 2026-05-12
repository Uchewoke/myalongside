const reports = [
  {
    id: "rep_101",
    against: "u_88",
    reason: "Harassment",
    status: "OPEN",
    priority: "HIGH",
    createdAt: "2025-03-10",
  },
  {
    id: "rep_102",
    against: "u_19",
    reason: "Unsafe Advice",
    status: "REVIEWING",
    priority: "MEDIUM",
    createdAt: "2025-03-11",
  },
  {
    id: "rep_103",
    against: "u_42",
    reason: "Spam",
    status: "RESOLVED",
    priority: "LOW",
    createdAt: "2025-03-11",
  },
];

export default function AdminReportsPage() {
  return (
    <main className="min-h-screen p-8 md:p-10">
      <h1 className="text-2xl font-semibold text-gray-900">Safety Reports</h1>
      <p className="mt-1 text-sm text-gray-600">Monitor incidents, escalate risk, and enforce trust policies.</p>

      <div className="mt-6 space-y-4">
        {reports.map((report) => (
          <article key={report.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">{report.id}</p>
                <h2 className="text-lg font-semibold text-gray-900">{report.reason}</h2>
                <p className="text-sm text-gray-600">Reported against: {report.against}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{report.status}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
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

            <div className="mt-4 flex gap-2">
              <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-100">Review</button>
              <button className="rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600">Take Action</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
