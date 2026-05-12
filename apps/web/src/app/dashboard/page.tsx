import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Users,
  Clock,
  ChevronRight,
} from "lucide-react";
import { MOCK_MENTORS, MOCK_CONVERSATIONS, MOCK_CURRENT_USER } from "@/lib/mock-data";
import { LIFE_EVENTS } from "@/lib/constants";
import MentorCard from "@/components/MentorCard";

const QUICK_STATS = [
  { label: "Active Matches", value: "3", icon: Users, color: "bg-brand-50 text-brand-600" },
  { label: "Messages", value: "8", icon: MessageCircle, color: "bg-teal-50 text-teal-600" },
  { label: "Days Active", value: "12", icon: Clock, color: "bg-amber-50 text-amber-600" },
  { label: "Progress", value: "64%", icon: TrendingUp, color: "bg-green-50 text-green-600" },
];

export default function DashboardPage() {
  const user = MOCK_CURRENT_USER;
  const userEvents = user.lifeEvents
    .map((id) => LIFE_EVENTS.find((e) => e.id === id))
    .filter(Boolean);

  const suggestedMentors = MOCK_MENTORS.filter((m) =>
    m.lifeEvents.some((e) => user.lifeEvents.includes(e))
  ).slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-hero-gradient p-6 sm:p-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-violet-600/20 blur-2xl" />
        <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-teal-600/20 blur-xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-violet-300">
              <Sparkles className="h-3 w-3" />
              You&apos;re not alone on this
            </div>
            <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
              Welcome back, {user.name.split(" ")[0]} 👋
            </h1>
            <p className="mt-2 max-w-lg text-stone-300">
              You have{" "}
              <span className="font-semibold text-white">2 new messages</span>{" "}
              and{" "}
              <span className="font-semibold text-white">1 new mentor suggestion</span>{" "}
              waiting for you.
            </p>

            {/* Active life events */}
            <div className="mt-4 flex flex-wrap gap-2">
              {userEvents.map(
                (e) =>
                  e && (
                    <span
                      key={e.id}
                      className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs text-stone-200 backdrop-blur-sm"
                    >
                      {e.emoji} {e.label}
                    </span>
                  )
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/find-mentor" className="btn-primary !bg-white !text-brand-700 hover:!bg-stone-100 !shadow-none !text-sm !px-5 !py-2.5">
              Find a Mentor
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/chat" className="btn-secondary !bg-white/10 !border-white/25 !text-white hover:!bg-white/20 !text-sm !px-5 !py-2.5">
              View Messages
            </Link>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {QUICK_STATS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-stone-900">{value}</p>
            <p className="mt-0.5 text-sm text-stone-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Two-column grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Mentor suggestions — 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-label">Suggested for You</p>
              <h2 className="mt-1 text-lg font-bold text-stone-900">
                Mentors who&apos;ve been there
              </h2>
            </div>
            <Link href="/find-mentor" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              See all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-1 xl:grid-cols-1">
            {suggestedMentors.map((mentor) => (
              <MentorCard key={mentor.id} mentor={mentor} compact />
            ))}
          </div>

          <Link
            href="/find-mentor"
            className="block rounded-2xl border-2 border-dashed border-stone-200 p-5 text-center text-sm text-stone-400 hover:border-brand-300 hover:text-brand-600 transition-colors"
          >
            + Browse all 2,400+ mentors
          </Link>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Recent conversations */}
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-stone-900">Recent Conversations</h3>
              <Link href="/chat" className="text-xs text-brand-600 hover:text-brand-700">
                All chats
              </Link>
            </div>
            <div className="space-y-4">
              {MOCK_CONVERSATIONS.map((conv) => {
                const event = LIFE_EVENTS.find((e) => e.id === conv.lifeEvent);
                return (
                  <Link
                    key={conv.id}
                    href={`/chat/${conv.participantId}`}
                    className="flex items-start gap-3 rounded-xl p-2 -mx-2 hover:bg-stone-50 transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      <Image
                        src={conv.participantAvatar}
                        alt={conv.participantName}
                        width={40}
                        height={40}
                        className="rounded-full bg-stone-100"
                      />
                      {conv.unreadCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[9px] font-bold text-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-semibold text-stone-900">
                          {conv.participantName}
                        </p>
                        <span className="flex-shrink-0 text-xs text-stone-400">
                          {conv.lastMessageTime}
                        </span>
                      </div>
                      {event && (
                        <span className="text-[10px] text-stone-400">
                          {event.emoji} {event.label}
                        </span>
                      )}
                      <p className="mt-0.5 truncate text-xs text-stone-500">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Life events card */}
          <div className="card p-5">
            <h3 className="mb-3 font-semibold text-stone-900">Your Life Events</h3>
            <div className="space-y-2">
              {userEvents.map(
                (e) =>
                  e && (
                    <div
                      key={e.id}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${e.color}`}
                    >
                      <span className="text-base">{e.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold">{e.label}</p>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-current/10">
                          <div
                            className="h-full rounded-full bg-current/40"
                            style={{ width: "60%" }}
                          />
                        </div>
                      </div>
                    </div>
                  )
              )}
            </div>
            <Link href="/find-mentor" className="mt-4 flex items-center justify-center gap-1 rounded-xl border border-dashed border-stone-200 py-2.5 text-xs text-stone-400 hover:border-brand-300 hover:text-brand-600 transition-colors">
              + Add a life event
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
