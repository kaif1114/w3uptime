import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes (frontend and API) that do not require a session cookie
// Matching is prefix-based: if a pathname starts with any of these, it's public
const publicRoutes: string[] = [
  "/",
  "/login",
  "/favicon.ico",
  "/api/auth/nonce",
  "/api/auth/verify",
  "/api/auth/session",
  "/api/auth/logout",
  "/api/public/status-pages",
  "/api/public/monitors", // Allow public access to monitor timeseries data
  "/api/proposals", // Allow public access to proposals API for reading
  "/status",
  "/_next", // Next.js internal assets
];

function isPublicPath(pathname: string): boolean {
  return publicRoutes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass checks for public routes and static assets (handled also via matcher)
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Preflight requests should pass through
  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get("sessionId")?.value;

  if (sessionId) {
    return NextResponse.next();
  }

  // No cookie present: handle API vs frontend differently
  if (pathname.startsWith("/api") && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "No session found", authenticated: false },
      { status: 401 }
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

// Apply middleware to all routes except static files and Next.js internals
export const config = {
  matcher: [
    // Skip next internals and common static file extensions
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:css|js|map|png|jpg|jpeg|svg|gif|ico|webp|woff|woff2|ttf)).*)",
  ],
};
