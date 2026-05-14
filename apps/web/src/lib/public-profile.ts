export type DisplayNameMode = "full-name" | "first-name-only" | "anonymous";

export interface PublicProfileSettings {
  general?: {
    anonymousMode?: boolean;
    displayNameMode?: DisplayNameMode;
    allowCommunityProfile?: boolean;
  };
  seeker?: {
    introVisibility?: "matched-only" | "all-verified-mentors";
    allowMentorSuggestions?: boolean;
    weeklyDigest?: boolean;
    crisisCheckins?: boolean;
    [key: string]: unknown;
  };
  mentor?: {
    availableForNewSeekers?: boolean;
    maxActiveSeekers?: number;
    mentoringFocus?: string;
    showResponseTemplates?: boolean;
    weeklyInsights?: boolean;
    [key: string]: unknown;
  };
}

export interface PublicProfileUser {
  id: string;
  name: string;
  avatar: string;
  role: "MENTOR" | "SEEKER";
  settings?: PublicProfileSettings;
}

const ANONYMOUS_AVATAR = "/anonymous-avatar.svg";

function getFirstName(name: string) {
  const firstName = name.trim().split(/\s+/)[0];
  return firstName || name;
}

export function isAnonymousProfile(user: PublicProfileUser) {
  const general = user.settings?.general;
  return Boolean(general?.anonymousMode || general?.displayNameMode === "anonymous");
}

export function getPublicDisplayName(user: PublicProfileUser) {
  const general = user.settings?.general;

  if (general?.anonymousMode || general?.displayNameMode === "anonymous") {
    return user.role === "MENTOR" ? "Anonymous Mentor" : "Anonymous Seeker";
  }

  if (general?.displayNameMode === "first-name-only") {
    return getFirstName(user.name);
  }

  return user.name;
}

export function getPublicAvatar(user: PublicProfileUser) {
  if (isAnonymousProfile(user)) {
    return ANONYMOUS_AVATAR;
  }

  return user.avatar || ANONYMOUS_AVATAR;
}

export function getPublicProfile(user: PublicProfileUser) {
  const general = user.settings?.general;
  const anonymous = isAnonymousProfile(user);

  return {
    ...user,
    displayName: getPublicDisplayName(user),
    avatar: getPublicAvatar(user),
    isAnonymous: anonymous,
    communityProfileVisible: general?.allowCommunityProfile ?? true,
  };
}
