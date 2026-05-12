"use client";

import Link from "next/link";
import { MOCK_CONVERSATIONS, MOCK_MENTORS } from "@/lib/mock-data";

export default function ChatInboxPage() {
  const myConversations = MOCK_CONVERSATIONS.map((conversation) => {
    const mentor = MOCK_MENTORS.find((m) => m.id === conversation.participantId);

    return {
      ...conversation,
      mentor,
    };
  });

  return (
    <main className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="section-label">Messages</p>
          <h1 className="mt-2 text-2xl font-bold text-stone-900 md:text-3xl">Your Conversations</h1>
        </div>
      </div>

      <section className="card p-2 md:p-3">
        <div className="divide-y divide-stone-100">
          {myConversations.map((conversation) => {
            const unread = conversation.unreadCount ?? 0;
            return (
              <Link
                key={conversation.id}
                href={`/chat/${conversation.id}`}
                className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-stone-50"
              >
                <img
                  src={conversation.mentor?.avatar}
                  alt={conversation.mentor?.name ?? "Mentor"}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-stone-900">{conversation.mentor?.name ?? "Mentor"}</p>
                    <p className="text-xs text-stone-500">{conversation.lastMessageTime}</p>
                  </div>
                  <p className="truncate text-sm text-stone-600">{conversation.lastMessage || "No messages yet"}</p>
                </div>
                {unread > 0 ? <span className="badge">{unread}</span> : null}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
