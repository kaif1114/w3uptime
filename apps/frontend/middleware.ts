import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";



const publicRoutes: string[] = [
  "/",
  "/favicon.ico",
  "/api/auth/nonce",
  "/api/auth/verify",
  "/api/auth/session",
  "/api/auth/logout",
  "/api/public/status-pages",
  "/api/public/monitors", 
  "/api/proposals", 
  "/status",
  "/slack/callback",
  "/slack/success",
  "/slack/error",
  "/api/slack/oauth",
  "/api/slack/integrations",
  "/_next", 
];

function isPublicPath(pathname: string): boolean {
  return publicRoutes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  
  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get("sessionId")?.value;

  if (sessionId) {
    return NextResponse.next();
  }

  
  if (pathname.startsWith("/api") && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "No session found", authenticated: false },
      { status: 401 }
    );
  }

  const homeUrl = request.nextUrl.clone();
  homeUrl.pathname = "/";
  homeUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(homeUrl);
}


export const config = {
  matcher: [
    
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:css|js|map|png|jpg|jpeg|svg|gif|ico|webp|woff|woff2|ttf)).*)",
  ],
};
