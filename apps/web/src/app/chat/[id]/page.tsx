"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Send, Phone, Video, MoreHorizontal, ArrowLeft, CheckCircle } from "lucide-react";
import { MOCK_MENTORS, MOCK_MESSAGES, MOCK_CURRENT_USER, MockMessage } from "@/lib/mock-data";
import { LIFE_EVENTS } from "@/lib/constants";
import { clsx } from "clsx";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const mentorId = typeof params?.id === "string" ? params.id : undefined;
  const mentor = MOCK_MENTORS.find((m) => m.id === mentorId);
  if (!mentor) notFound();

  const [messages, setMessages] = useState<MockMessage[]>(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sharedEvents = mentor.lifeEvents
    .map((id) => LIFE_EVENTS.find((e) => e.id === id))
    .filter(Boolean)
    .slice(0, 2);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setInput("");
    setIsSending(true);

    const userMsg: MockMessage = {
      id: `msg-${Date.now()}`,
      senderId: MOCK_CURRENT_USER.id,
      content: text,
      timestamp: "Just now",
      read: false,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Simulate mentor reply after a short delay
    await new Promise((r) => setTimeout(r, 1800));

    const replies = [
      "That's such an important insight. Can you tell me more about what's driving that feeling?",
      "I completely understand that. When I was in a similar place, I found that just naming the emotion helped me enormously.",
      "You're doing the right thing by talking about it. What would feel like a small step forward for you this week?",
      "That resonates deeply. The discomfort you're feeling is actually a sign of growth happening.",
    ];

    const mentorMsg: MockMessage = {
      id: `msg-${Date.now() + 1}`,
      senderId: mentor.id,
      content: replies[Math.floor(Math.random() * replies.length)],
      timestamp: "Just now",
      read: false,
    };
    setMessages((prev) => [...prev, mentorMsg]);
    setIsSending(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-card">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <div className="flex items-center gap-3.5">
          <Link href="/dashboard" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 sm:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="relative">
            <Image
              src={mentor.avatar}
              alt={mentor.name}
              width={44}
              height={44}
              className="rounded-full bg-stone-100"
            />
            {mentor.availability === "AVAILABLE" && (
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-stone-900">{mentor.name}</h2>
              {mentor.isVerified && (
                <CheckCircle className="h-3.5 w-3.5 text-brand-500" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span
                className={clsx(
                  "inline-block h-2 w-2 rounded-full",
                  mentor.availability === "AVAILABLE" ? "bg-green-500" : "bg-stone-300"
                )}
              />
              {mentor.availability === "AVAILABLE" ? "Active now" : "Last seen recently"}
              {sharedEvents.length > 0 && (
                <>
                  <span>·</span>
                  {sharedEvents.map((e) => e && (
                    <span key={e.id}>{e.emoji} {e.label}</span>
                  )).reduce<React.ReactNode[]>((acc, cur, i) => (i === 0 ? [cur] : [...acc, ", ", cur]), [])}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-xl p-2.5 text-stone-400 hover:bg-stone-100 transition-colors" title="Voice call">
            <Phone className="h-4 w-4" />
          </button>
          <button className="rounded-xl p-2.5 text-stone-400 hover:bg-stone-100 transition-colors" title="Video call">
            <Video className="h-4 w-4" />
          </button>
          <button className="rounded-xl p-2.5 text-stone-400 hover:bg-stone-100 transition-colors" title="More options">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">
        {/* Context banner */}
        <div className="mx-auto max-w-sm rounded-2xl border border-brand-100 bg-brand-50 p-4 text-center text-xs text-brand-700">
          <p className="font-semibold mb-1">This is a safe, private space.</p>
          <p className="text-brand-600">
            {mentor.name} is here to support you through{" "}
            {sharedEvents.map((e) => e?.label).join(" and ")}.
            All conversations are confidential.
          </p>
        </div>

        {messages.map((msg) => {
          const isMe = msg.senderId === MOCK_CURRENT_USER.id;
          const sender = isMe ? MOCK_CURRENT_USER : mentor;

          return (
            <div
              key={msg.id}
              className={clsx(
                "flex items-end gap-2.5",
                isMe ? "flex-row-reverse" : "flex-row"
              )}
            >
              <Image
                src={sender.avatar}
                alt={sender.name}
                width={32}
                height={32}
                className="mb-1 flex-shrink-0 rounded-full bg-stone-100"
              />
              <div
                className={clsx(
                  "max-w-[72%] space-y-1",
                  isMe ? "items-end" : "items-start",
                  "flex flex-col"
                )}
              >
                <div
                  className={clsx(
                    "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    isMe
                      ? "rounded-br-sm bg-brand-gradient text-white"
                      : "rounded-bl-sm bg-stone-100 text-stone-800"
                  )}
                >
                  {msg.content}
                </div>
                <span className="px-1 text-[10px] text-stone-400">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isSending && (
          <div className="flex items-end gap-2.5">
            <Image
              src={mentor.avatar}
              alt={mentor.name}
              width={32}
              height={32}
              className="mb-1 rounded-full bg-stone-100"
            />
            <div className="rounded-2xl rounded-bl-sm bg-stone-100 px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-stone-400 animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-stone-100 px-4 py-4">
        <form onSubmit={sendMessage} className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${mentor.name}…`}
            className="input-field flex-1 !py-3"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-2 text-center text-[10px] text-stone-400">
          MyAlongside is a peer support platform. If you&apos;re in crisis, please call{" "}
          <a href="tel:988" className="font-medium text-brand-600">988</a> (US) or your local emergency services.
        </p>
      </div>
    </div>
  );
}
