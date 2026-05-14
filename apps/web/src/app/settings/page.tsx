"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Shield, Bell, UserRound, BriefcaseBusiness, Globe, Save, TriangleAlert, EyeOff } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { MOCK_CURRENT_USER } from "@/lib/mock-data";
import { API_BASE } from "@/lib/constants";
import { getPublicProfile } from "@/lib/public-profile";

type UserRole = "MENTOR" | "SEEKER";

interface SeekerSettingsState {
  introVisibility: "matched-only" | "all-verified-mentors";
  allowMentorSuggestions: boolean;
  weeklyDigest: boolean;
  crisisCheckins: boolean;
  [key: string]: unknown;
}

interface MentorSettingsState {
  availableForNewSeekers: boolean;
  maxActiveSeekers: number;
  mentoringFocus: string;
  showResponseTemplates: boolean;
  weeklyInsights: boolean;
  [key: string]: unknown;
}

interface GeneralSettingsState {
  anonymousMode: boolean;
  displayNameMode: "full-name" | "first-name-only" | "anonymous";
  allowCommunityProfile: boolean;
  emailNotifications: boolean;
  matchNotifications: boolean;
  messageNotifications: boolean;
  productAnnouncements: boolean;
  [key: string]: unknown;
}

export default function SettingsPage() {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);
  const user = authUser ?? MOCK_CURRENT_USER;
  const publicUser = getPublicProfile(user);

  const role = user.role as UserRole;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettingsState>({
    anonymousMode: user.settings?.general?.anonymousMode ?? false,
    displayNameMode: user.settings?.general?.displayNameMode ?? "full-name",
    allowCommunityProfile: user.settings?.general?.allowCommunityProfile ?? true,
    emailNotifications: true,
    matchNotifications: true,
    messageNotifications: true,
    productAnnouncements: false,
  });
  const [seekerSettings, setSeekerSettings] = useState<SeekerSettingsState>({
    introVisibility: "matched-only",
    allowMentorSuggestions: true,
    weeklyDigest: true,
    crisisCheckins: true,
  });

  const [mentorSettings, setMentorSettings] = useState<MentorSettingsState>({
    availableForNewSeekers: true,
    maxActiveSeekers: 8,
    mentoringFocus: "Career transitions and emotional resilience",
    showResponseTemplates: true,
    weeklyInsights: true,
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    const loadSettings = async () => {
      setLoading(true);
      setStatus(null);

      try {
        const response = await fetch(`${API_BASE}/api/auth/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load profile settings.");
        }

        const payload = await response.json();
        const profileUser = payload?.user;

        if (!active || !profileUser) {
          return;
        }

        if (profileUser.settings?.general) {
          setGeneralSettings((prev) => ({
            ...prev,
            ...profileUser.settings.general,
          }));
        }

        if (profileUser.settings?.seeker) {
          setSeekerSettings((prev) => ({
            ...prev,
            ...profileUser.settings.seeker,
          }));
        }

        if (profileUser.settings?.mentor) {
          setMentorSettings((prev) => ({
            ...prev,
            ...profileUser.settings.mentor,
          }));
        }

        updateUser({
          name: profileUser.name,
          avatar: profileUser.avatar,
          settings: profileUser.settings,
        });
      } catch {
        if (active) {
          setStatus("Could not load saved settings. Showing local defaults.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      active = false;
    };
  }, [token, updateUser]);

  const roleSummary = useMemo(() => {
    if (role === "MENTOR") {
      return "Adjust availability, mentorship capacity, and assistant behavior for your mentor workspace.";
    }

    return "Control your matching, outreach visibility, and support notifications as a seeker.";
  }, [role]);

  const handleSave = async () => {
    if (!token) {
      updateUser({
        settings: {
          general: generalSettings,
          seeker: seekerSettings,
          mentor: mentorSettings,
        },
      });
      setStatus("Saved locally.");
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          settings: {
            general: generalSettings,
            seeker: seekerSettings,
            mentor: mentorSettings,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings.");
      }

      const payload = await response.json();
      const profileUser = payload?.user;

      if (profileUser?.settings?.general) {
        setGeneralSettings((prev) => ({ ...prev, ...profileUser.settings.general }));
      }

      if (profileUser?.settings?.seeker) {
        setSeekerSettings((prev) => ({ ...prev, ...profileUser.settings.seeker }));
      }

      if (profileUser?.settings?.mentor) {
        setMentorSettings((prev) => ({ ...prev, ...profileUser.settings.mentor }));
      }

      if (profileUser) {
        updateUser({
          name: profileUser.name,
          avatar: profileUser.avatar,
          settings: profileUser.settings,
        });
      }

      setStatus("Settings saved successfully.");
    } catch {
      setStatus("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) {
      setStatus("Sign in required to delete your account.");
      return;
    }

    if (deleteConfirm !== "DELETE") {
      setStatus('Type DELETE to confirm account deletion.');
      return;
    }

    const confirmed = window.confirm(
      "Delete your MyAlongside account permanently? This removes your profile, matches, messages, and related data."
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setStatus(null);

    try {
      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete account.");
      }

      logout();
      router.push("/");
    } catch {
      setStatus("Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="p-4 md:p-8">
      <div className="mb-6">
        <p className="section-label">Settings</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-900 md:text-3xl">
          {role === "MENTOR" ? "Mentor Settings" : "Seeker Settings"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">{roleSummary}</p>
        {loading ? <p className="mt-2 text-xs text-stone-500">Loading saved settings...</p> : null}
        {status ? <p className="mt-2 text-xs text-stone-500">{status}</p> : null}
      </div>

      <section className="card mb-6 flex items-center gap-4 p-5">
        <Image src={publicUser.avatar} alt={publicUser.displayName} width={56} height={56} className="rounded-full bg-stone-100" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Current public identity</p>
          <h2 className="text-lg font-semibold text-stone-900">{publicUser.displayName}</h2>
          <p className="text-sm text-stone-500">
            {publicUser.isAnonymous ? "Anonymous mode is active." : "Your real name is shown on shared surfaces."}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="card p-6">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-stone-500" />
            <h2 className="text-lg font-semibold text-stone-900">Account Preferences</h2>
          </div>

          {role === "SEEKER" ? (
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">Intro visibility</label>
                <select
                  value={seekerSettings.introVisibility}
                  onChange={(e) =>
                    setSeekerSettings((prev) => ({
                      ...prev,
                      introVisibility: e.target.value as SeekerSettingsState["introVisibility"],
                    }))
                  }
                  className="input-field"
                >
                  <option value="matched-only">Matched mentors only</option>
                  <option value="all-verified-mentors">All verified mentors</option>
                </select>
              </div>

              <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3">
                <span className="text-sm text-stone-700">Allow AI mentor suggestions</span>
                <input
                  type="checkbox"
                  checked={seekerSettings.allowMentorSuggestions}
                  onChange={(e) =>
                    setSeekerSettings((prev) => ({ ...prev, allowMentorSuggestions: e.target.checked }))
                  }
                />
              </label>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3">
                <span className="text-sm text-stone-700">Available for new seekers</span>
                <input
                  type="checkbox"
                  checked={mentorSettings.availableForNewSeekers}
                  onChange={(e) =>
                    setMentorSettings((prev) => ({ ...prev, availableForNewSeekers: e.target.checked }))
                  }
                />
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">Maximum active seekers</label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  className="input-field"
                  value={mentorSettings.maxActiveSeekers}
                  onChange={(e) =>
                    setMentorSettings((prev) => ({
                      ...prev,
                      maxActiveSeekers: Number(e.target.value) || 1,
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">Mentoring focus</label>
                <input
                  type="text"
                  className="input-field"
                  value={mentorSettings.mentoringFocus}
                  onChange={(e) =>
                    setMentorSettings((prev) => ({ ...prev, mentoringFocus: e.target.value }))
                  }
                />
              </div>
            </div>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-stone-500" />
            <h2 className="text-lg font-semibold text-stone-900">Notification Settings</h2>
          </div>

          {role === "SEEKER" ? (
            <div className="mt-5 space-y-3">
              <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3">
                <span className="text-sm text-stone-700">Weekly progress digest</span>
                <input
                  type="checkbox"
                  checked={seekerSettings.weeklyDigest}
                  onChange={(e) =>
                    setSeekerSettings((prev) => ({ ...prev, weeklyDigest: e.target.checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3">
                <span className="text-sm text-stone-700">Crisis support check-ins</span>
                <input
                  type="checkbox"
                  checked={seekerSettings.crisisCheckins}
                  onChange={(e) =>
                    setSeekerSettings((prev) => ({ ...prev, crisisCheckins: e.target.checked }))
                  }
                />
              </label>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3">
                <span className="text-sm text-stone-700">Mentor response templates</span>
                <input
                  type="checkbox"
                  checked={mentorSettings.showResponseTemplates}
                  onChange={(e) =>
                    setMentorSettings((prev) => ({ ...prev, showResponseTemplates: e.target.checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3">
                <span className="text-sm text-stone-700">Weekly mentorship insights</span>
                <input
                  type="checkbox"
                  checked={mentorSettings.weeklyInsights}
                  onChange={(e) =>
                    setMentorSettings((prev) => ({ ...prev, weeklyInsights: e.target.checked }))
                  }
                />
              </label>
            </div>
          )}
        </section>
      </div>

      <section className="card mt-6 p-6">
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="h-5 w-5 text-stone-500" />
          <h2 className="text-lg font-semibold text-stone-900">Preferences</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-stone-200 p-4">
            <label className="mb-2 block text-sm font-medium text-stone-700">Display name</label>
            <select
              value={generalSettings.displayNameMode}
              onChange={(e) =>
                setGeneralSettings((prev) => ({
                  ...prev,
                  displayNameMode: e.target.value as GeneralSettingsState["displayNameMode"],
                }))
              }
              className="input-field"
            >
              <option value="full-name">Full name</option>
              <option value="first-name-only">First name only</option>
              <option value="anonymous">Anonymous alias</option>
            </select>
          </div>

          <div className="rounded-xl border border-stone-200 p-4">
            <div className="mb-2 flex items-center gap-2 text-stone-700">
              <Shield className="h-4 w-4" />
              <p className="text-sm font-semibold">Privacy</p>
            </div>
            <p className="text-xs text-stone-600">
              Your profile details are only shared according to your role-based visibility settings.
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 p-4">
            <div className="mb-2 flex items-center gap-2 text-stone-700">
              <Globe className="h-4 w-4" />
              <p className="text-sm font-semibold">Localization</p>
            </div>
            <p className="text-xs text-stone-600">
              Language and regional defaults follow your profile and can be expanded in future updates.
            </p>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-stone-200 p-4">
            <div>
              <p className="text-sm font-semibold text-stone-800">Community profile visible</p>
              <p className="mt-1 text-xs text-stone-500">Allow other members to discover your profile in community spaces.</p>
            </div>
            <input
              type="checkbox"
              checked={generalSettings.allowCommunityProfile}
              onChange={(e) =>
                setGeneralSettings((prev) => ({ ...prev, allowCommunityProfile: e.target.checked }))
              }
            />
          </label>
        </div>
      </section>

      <section className="card mt-6 p-6">
        <div className="mb-4 flex items-center gap-2">
          <EyeOff className="h-5 w-5 text-stone-500" />
          <h2 className="text-lg font-semibold text-stone-900">Anonymous Settings</h2>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3">
            <span className="text-sm text-stone-700">Appear anonymous to other users</span>
            <input
              type="checkbox"
              checked={generalSettings.anonymousMode}
              onChange={(e) =>
                setGeneralSettings((prev) => ({
                  ...prev,
                  anonymousMode: e.target.checked,
                  displayNameMode: e.target.checked ? "anonymous" : prev.displayNameMode === "anonymous" ? "full-name" : prev.displayNameMode,
                }))
              }
            />
          </label>
          <p className="ml-1 text-xs text-stone-500">
            Anonymous mode hides your personal identity in profile surfaces and uses your selected display-name mode.
          </p>
        </div>
      </section>

      <section className="card mt-6 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-stone-500" />
          <h2 className="text-lg font-semibold text-stone-900">Notification Settings</h2>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3">
            <span className="text-sm text-stone-700">Email notifications</span>
            <input
              type="checkbox"
              checked={generalSettings.emailNotifications}
              onChange={(e) =>
                setGeneralSettings((prev) => ({ ...prev, emailNotifications: e.target.checked }))
              }
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3">
            <span className="text-sm text-stone-700">Match updates</span>
            <input
              type="checkbox"
              checked={generalSettings.matchNotifications}
              onChange={(e) =>
                setGeneralSettings((prev) => ({ ...prev, matchNotifications: e.target.checked }))
              }
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3">
            <span className="text-sm text-stone-700">Message alerts</span>
            <input
              type="checkbox"
              checked={generalSettings.messageNotifications}
              onChange={(e) =>
                setGeneralSettings((prev) => ({ ...prev, messageNotifications: e.target.checked }))
              }
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3">
            <span className="text-sm text-stone-700">Product announcements</span>
            <input
              type="checkbox"
              checked={generalSettings.productAnnouncements}
              onChange={(e) =>
                setGeneralSettings((prev) => ({ ...prev, productAnnouncements: e.target.checked }))
              }
            />
          </label>
        </div>
      </section>

      <section className="card mt-6 p-6 border border-red-200">
        <div className="mb-4 flex items-center gap-2">
          <TriangleAlert className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
        </div>
        <p className="mb-4 text-xs text-red-600">Delete your account and all associated data. This action is irreversible.</p>
        <label className="mb-3 block text-xs font-medium uppercase tracking-wide text-red-700">
          Type DELETE to confirm
        </label>
        <input
          type="text"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          className="input-field border-red-200 focus:border-red-400 focus:ring-red-200"
          placeholder="DELETE"
        />
        <div className="mt-4">
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleting || deleteConfirm !== "DELETE"}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {deleting ? "Deleting account..." : "Delete Account"}
          </button>
        </div>
      </section>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving settings..." : "Save Settings"}
        </button>
      </div>
    </main>
  );
}
