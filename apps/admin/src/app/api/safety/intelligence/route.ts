import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const adminServiceToken = process.env.ADMIN_SERVICE_TOKEN;

export async function POST(req: Request) {
  if (!adminServiceToken) {
    return NextResponse.json(
      { error: "Admin service token is not configured." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const response = await fetch(`${backendUrl}/api/ai/safety/intelligence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-service-token": adminServiceToken,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}