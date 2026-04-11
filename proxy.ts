import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDefaultPathForRole, isAppRole } from "@/lib/auth";

const protectedPrefixes = [
  "/change-password",
  "/mfa/setup",
  "/mfa/verify",
  "/register-device",
  "/cases",
  "/settings",
  "/hp/settings",
  "/paramedics",
  "/hospitals",
  "/admin",
  "/dispatch",
] as const;

function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function hasAccess(pathname: string, role: string): boolean {
  if (pathname.startsWith("/change-password")) return true;
  if (pathname.startsWith("/mfa/setup")) return role === "EMS" || role === "HOSPITAL" || role === "ADMIN" || role === "DISPATCH";
  if (pathname.startsWith("/mfa/verify")) return role === "EMS" || role === "HOSPITAL" || role === "ADMIN" || role === "DISPATCH";
  if (pathname.startsWith("/register-device")) return role === "EMS" || role === "HOSPITAL";
  if (pathname.startsWith("/cases")) return role === "EMS";
  if (pathname.startsWith("/settings")) return role === "EMS";
  if (pathname.startsWith("/hp/settings")) return role === "HOSPITAL";
  if (pathname.startsWith("/paramedics")) return role === "EMS";
  if (pathname.startsWith("/hospitals")) {
    if (role === "HOSPITAL") return true;
    if (role === "EMS") {
      return (
        pathname === "/hospitals/search" ||
        pathname.startsWith("/hospitals/request/confirm") ||
        pathname.startsWith("/hospitals/request/completed")
      );
    }
    return false;
  }
  if (pathname.startsWith("/admin")) return role === "ADMIN";
  if (pathname.startsWith("/dispatch")) return role === "DISPATCH" || role === "ADMIN";
  return true;
}

function redirectWithCallback(baseUrl: string, path: string, callbackPath: string) {
  const url = new URL(path, baseUrl);
  url.searchParams.set("callbackUrl", callbackPath);
  return url;
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const authUser = req.auth?.user as {
    role?: string;
    authExpired?: boolean;
    authInvalidated?: boolean;
    deviceTrusted?: boolean;
    deviceEnforcementRequired?: boolean;
    mfaEnrolled?: boolean;
    mfaRequired?: boolean;
    mfaVerified?: boolean;
    mustChangePassword?: boolean;
  } | undefined;
  const role = authUser?.role;
  const isSessionUsable = Boolean(req.auth?.user) && !authUser?.authExpired && !authUser?.authInvalidated;
  const needsDeviceRegistration =
    isSessionUsable &&
    (role === "EMS" || role === "HOSPITAL") &&
    authUser?.deviceEnforcementRequired === true &&
    authUser?.deviceTrusted !== true;
  const needsMfaSetup =
    isSessionUsable &&
    authUser?.mfaRequired === true &&
    authUser?.mfaEnrolled !== true;
  const needsMfaVerification =
    isSessionUsable &&
    authUser?.mfaRequired === true &&
    authUser?.mfaEnrolled === true &&
    authUser?.mfaVerified !== true;

  if (pathname === "/") {
    if (role && isAppRole(role) && isSessionUsable) {
      if (needsMfaSetup) return NextResponse.redirect(redirectWithCallback(req.url, "/mfa/setup", getDefaultPathForRole(role)));
      if (needsMfaVerification) return NextResponse.redirect(redirectWithCallback(req.url, "/mfa/verify", getDefaultPathForRole(role)));
      return NextResponse.redirect(new URL(getDefaultPathForRole(role), req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname === "/login") {
    if (role && isAppRole(role) && isSessionUsable) {
      const callbackPath = req.nextUrl.searchParams.get("callbackUrl") || getDefaultPathForRole(role);
      if (needsMfaSetup) return NextResponse.redirect(redirectWithCallback(req.url, "/mfa/setup", callbackPath));
      if (needsMfaVerification) return NextResponse.redirect(redirectWithCallback(req.url, "/mfa/verify", callbackPath));
      return NextResponse.redirect(new URL(getDefaultPathForRole(role), req.url));
    }
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!isSessionUsable) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!role || !isAppRole(role)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (authUser?.mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", req.url));
  }

  if (needsMfaSetup && pathname !== "/mfa/setup") {
    return NextResponse.redirect(redirectWithCallback(req.url, "/mfa/setup", pathname));
  }

  if (needsMfaVerification && pathname !== "/mfa/verify") {
    return NextResponse.redirect(redirectWithCallback(req.url, "/mfa/verify", pathname));
  }

  if (needsDeviceRegistration && pathname !== "/register-device" && !pathname.startsWith("/mfa/")) {
    return NextResponse.redirect(new URL("/register-device", req.url));
  }

  if (!hasAccess(pathname, role)) {
    return NextResponse.redirect(new URL(getDefaultPathForRole(role), req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/login", "/change-password", "/mfa/setup", "/mfa/verify", "/register-device", "/cases/:path*", "/settings/:path*", "/hp/settings/:path*", "/paramedics/:path*", "/hospitals/:path*", "/admin/:path*", "/dispatch/:path*"],
};
