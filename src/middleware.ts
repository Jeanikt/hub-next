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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const loggedIn = !!token;
  const userId = token?.sub ?? (token as { id?: string })?.id;
  const onboardingCompleted = (token as { onboardingCompleted?: boolean })?.onboardingCompleted ?? true;

  if (isAuthPath(pathname) && !isOnboardingPath(pathname) && !loggedIn) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (loggedIn && !onboardingCompleted && !isOnboardingPath(pathname) && isAuthPath(pathname)) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (pathname.startsWith("/admin") && loggedIn) {
    const email = (token as { email?: string })?.email ?? null;
    const allowedAdmin = process.env.ALLOWED_ADMIN_EMAIL ?? "jeandev003@gmail.com";
    if (!email || email.toLowerCase() !== allowedAdmin.toLowerCase()) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
