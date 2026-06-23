import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "myalongside-admin-session";
const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function proxy(req: NextRequest) {
  const rawSession = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const { pathname } = req.nextUrl;

  const isLoginRoute = pathname === "/login";
  const isAuthApiRoute = pathname.startsWith("/api/auth/");
  const isStaticAsset = pathname.startsWith("/_next/") || pathname === "/favicon.ico";

  if (isAuthApiRoute || isStaticAsset) {
    return NextResponse.next();
  }

  if (!rawSession && !isLoginRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  let sessionToken: string | null = null;
  if (rawSession) {
    try {
      const parsed = JSON.parse(rawSession) as { token?: string };
      sessionToken = typeof parsed.token === "string" ? parsed.token : null;
    } catch {
      sessionToken = null;
    }
  }

  if (!sessionToken) {
    if (isLoginRoute) {
      return NextResponse.next();
    }

    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete(ADMIN_SESSION_COOKIE);
    return response;
  }

  const authResponse = await fetch(`${backendUrl}/api/auth/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!authResponse?.ok) {
    if (isLoginRoute) {
      const response = NextResponse.next();
      response.cookies.delete(ADMIN_SESSION_COOKIE);
      return response;
    }

    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete(ADMIN_SESSION_COOKIE);
    return response;
  }

  const payload = (await authResponse.json().catch(() => null)) as {
    user?: { role?: string };
  } | null;

  if (payload?.user?.role !== "ADMIN") {
    const response = isLoginRoute
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete(ADMIN_SESSION_COOKIE);
    return response;
  }

  if (isLoginRoute) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};