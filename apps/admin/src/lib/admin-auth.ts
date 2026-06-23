import "server-only";

import { cookies } from "next/headers";

const ADMIN_SESSION_COOKIE = "myalongside-admin-session";
const isProduction = process.env.NODE_ENV === "production";

export type AdminSession = {
  token: string;
  user: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export async function setAdminSession(session: AdminSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}