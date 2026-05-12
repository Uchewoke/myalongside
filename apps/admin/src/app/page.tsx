"use client";

import Link from "next/link";

const stats = [
  { label: "Total Users", value: "18,420", delta: "+12.4%" },
  { label: "Active Matches", value: "2,310", delta: "+8.1%" },
  { label: "Open Reports", value: "37", delta: "-14.0%" },
  { label: "MRR", value: "$89,200", delta: "+5.2%" },
];

export default function AdminHomePage() {
  return (
    <main className="min-h-screen p-8 md:p-10">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-700">MyAlongside Admin</p>
          <h1 className="text-3xl font-semibold text-gray-900">Platform Overview</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/users"
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100"
          >
            Manage Users
          </Link>
          <Link
            href="/reports"
            className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Safety Reports
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{stat.value}</p>
            <p className="mt-2 text-sm font-medium text-emerald-600">{stat.delta} this month</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 lg:col-span-2">
          <h2 className="text-lg font-semibold">Operational Pulse</h2>
          <p className="mt-2 text-sm text-gray-600">
            New mentorship requests are rising around job-loss and health-crisis categories. Moderator response SLA remains under 35 minutes.
          </p>
          <div className="mt-5 rounded-xl bg-gray-100 p-5 text-sm text-gray-700">
            Chart placeholder: connect API metrics or Recharts line/area chart here.
          </div>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-semibold">Action Queue</h2>
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            <li className="rounded-lg bg-amber-50 p-3">12 mentor verification requests pending review</li>
            <li className="rounded-lg bg-rose-50 p-3">5 crisis-flagged conversations require immediate check</li>
            <li className="rounded-lg bg-blue-50 p-3">8 new appeals from restricted accounts</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
