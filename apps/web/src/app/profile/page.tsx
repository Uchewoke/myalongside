"use client";

import { useState } from "react";
import Image from "next/image";
import { LIFE_EVENTS } from "@/lib/constants";
import { MOCK_CURRENT_USER } from "@/lib/mock-data";
import { useAuthStore } from "@/store/useAuthStore";
import { getPublicProfile } from "@/lib/public-profile";

export default function ProfilePage() {
  const authUser = useAuthStore((state) => state.user);
  const currentUser = authUser ?? MOCK_CURRENT_USER;
  const publicUser = getPublicProfile(currentUser);

  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio ?? "");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(currentUser.lifeEvents ?? []);
  const [saving, setSaving] = useState(false);

  const toggleEvent = (id: string) => {
    setSelectedEvents((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSaving(false);
  };

  return (
    <main className="p-4 md:p-8">
      <div className="mb-6">
        <p className="section-label">Profile</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-900 md:text-3xl">Your Personal Story</h1>
      </div>

      <section className="card mb-6 flex items-center gap-4 p-5">
        <Image src={publicUser.avatar} alt={publicUser.displayName} width={56} height={56} className="rounded-full bg-stone-100" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Public preview</p>
          <h2 className="text-lg font-semibold text-stone-900">{publicUser.displayName}</h2>
          <p className="text-sm text-stone-500">
            {publicUser.isAnonymous ? "Anonymous mode is active for profile surfaces." : "Your profile is shown with your full identity."}
          </p>
        </div>
      </section>

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-stone-900">Basic Information</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">Full name</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">Short bio</label>
              <textarea
                className="input-field min-h-28 resize-none"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your story and what support means to you..."
              />
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold text-stone-900">Life Events</h2>
          <p className="mt-1 text-sm text-stone-600">Choose the life events that shape your journey.</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {LIFE_EVENTS.map((event) => {
              const active = selectedEvents.includes(event.id);
              return (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => toggleEvent(event.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active ? "border-brand-500 bg-brand-50" : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <p className="text-sm font-semibold text-stone-900">
                    <span className="mr-2">{event.emoji}</span>
                    {event.label}
                  </p>
                  <p className="mt-1 text-xs text-stone-600">{event.description}</p>
                </button>
              );
            })}
          </div>

          <button type="submit" className="btn-primary mt-6 w-full" disabled={saving}>
            {saving ? "Saving profile..." : "Save Profile"}
          </button>
        </section>
      </form>
    </main>
  );
}
