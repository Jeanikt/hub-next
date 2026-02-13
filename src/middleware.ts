import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/two-factor",
  "/leaderboard",
  "/users",
  "/tournaments",
  "/missions",
  "/parceiros",
];
const authPaths = [
  "/dashboard",
  "/queue",
  "/matches",
  "/friends",
  "/admin",
  "/onboarding",
  "/messages",
  "/profile",
  "/notifications",
  "/support",
  "/reports",
  "/banned",
];

function isPublic(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isAuthPath(pathname: string): boolean {
  return authPaths.some((p) => pathname.startsWith(p));
}

function isOnboardingPath(pathname: string): boolean {
  return pathname.startsWith("/onboarding");
}

const REF_COOKIE = "hub_invite_ref";
const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const ref = request.nextUrl.searchParams.get("ref")?.trim();
  const setRefCookie = (res: NextResponse) => {
    if (ref && ref.length >= 4 && ref.length <= 20) {
      res.cookies.set(REF_COOKIE, ref.toUpperCase(), {
        maxAge: REF_COOKIE_MAX_AGE,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return res;
  };

  // Em produção (HTTPS) o NextAuth usa cookie __Secure-authjs.session-token;
  // getToken precisa de secureCookie: true para ler o mesmo nome.
  const isSecure = request.nextUrl.protocol === "https:";
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: isSecure,
  });

  const loggedIn = !!token;
  const userId = token?.sub ?? (token as { id?: string })?.id;
  const onboardingCompleted = (token as { onboardingCompleted?: boolean })?.onboardingCompleted ?? true;

  if (isAuthPath(pathname) && !isOnboardingPath(pathname) && !loggedIn) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return setRefCookie(NextResponse.redirect(login));
  }

  if (loggedIn && !onboardingCompleted && !isOnboardingPath(pathname) && isAuthPath(pathname)) {
    return setRefCookie(NextResponse.redirect(new URL("/onboarding", request.url)));
  }

  if (pathname.startsWith("/admin") && loggedIn) {
    const email = ((token as { email?: string })?.email ?? null)?.toLowerCase();
    const raw = process.env.ALLOWED_ADMIN_EMAIL ?? "jeandev003@gmail.com,yagobtelles@gmail.com,pereirawesley.dev@gmail.com,santiagosslemes@gmail.com";
    const allowedSet = new Set(raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));
    if (!email || !allowedSet.has(email)) {
      return setRefCookie(NextResponse.redirect(new URL("/dashboard", request.url)));
    }
  }

  const res = setRefCookie(NextResponse.next());
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
