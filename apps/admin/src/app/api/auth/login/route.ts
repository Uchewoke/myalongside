import { NextResponse } from "next/server";
import { setAdminSession } from "@/lib/admin-auth";

const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function POST(req: Request) {
  const body = await req.json();
  const loginResponse = await fetch(`${backendUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await loginResponse.json().catch(() => ({ error: "Unable to sign in." }));
  if (!loginResponse.ok) {
    return NextResponse.json(payload, { status: loginResponse.status });
  }

  if (payload?.user?.role !== "ADMIN" || typeof payload?.accessToken !== "string") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  await setAdminSession({
    token: payload.accessToken,
    user: {
      id: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
      role: payload.user.role,
    },
  });

  return NextResponse.json({ ok: true, user: payload.user });
}