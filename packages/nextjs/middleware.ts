import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const host = request.headers.get("host");
    if (host && (host.includes("localhost") || host.includes("127.0.0.1"))) {
      return NextResponse.redirect(new URL(`/dashboard`, request.url));
    }
    return NextResponse.redirect(new URL(`/dashboard`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
