// proxy.js
import { NextResponse } from "next/server";

export function proxy(req) {
  const session = req.cookies.get("session")?.value;

  // Protect the test route
  if (!session && req.nextUrl.pathname.startsWith("/test")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/test"],
};
