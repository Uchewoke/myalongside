import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin authentication required." },
      { status: 401 }
    );
  }

  const authorization = `Bearer ${session.token}`;

  const authResponse = await fetch(`${backendUrl}/api/auth/profile`, {
    method: "GET",
    headers: {
      Authorization: authorization,
    },
    cache: "no-store",
  });

  if (!authResponse.ok) {
    return NextResponse.json(
      { error: "Admin authentication required." },
      { status: authResponse.status === 403 ? 403 : 401 }
    );
  }

  const authPayload = await authResponse.json();
  if (authPayload?.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const response = await fetch(`${backendUrl}/api/ai/safety/intelligence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}