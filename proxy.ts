import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDefaultPathForRole, isAppRole } from "@/lib/auth";

const protectedPrefixes = [
  "/paramedics",
  "/hospitals",
  "/admin",
] as const;

function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function hasAccess(pathname: string, role: string): boolean {
  if (pathname.startsWith("/paramedics")) return role === "EMS";
  if (pathname.startsWith("/hospitals")) return role === "HOSPITAL";
  if (pathname.startsWith("/admin")) return role === "ADMIN";
  return true;
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const role = (req.auth?.user as { role?: string } | undefined)?.role;

  if (pathname === "/") {
    if (role && isAppRole(role)) {
      return NextResponse.redirect(new URL(getDefaultPathForRole(role), req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname === "/login") {
    if (role && isAppRole(role)) {
      return NextResponse.redirect(new URL(getDefaultPathForRole(role), req.url));
    }
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!req.auth?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!role || !isAppRole(role)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!hasAccess(pathname, role)) {
    return NextResponse.redirect(new URL(getDefaultPathForRole(role), req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/login", "/paramedics/:path*", "/hospitals/:path*", "/admin/:path*"],
};
