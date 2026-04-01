import type { AuthenticatedUser } from "@/lib/authContext";
import { isCaseReader } from "@/lib/caseAccess";

type RouteAccessResult<T extends AuthenticatedUser = AuthenticatedUser> =
  | { ok: true; user: T }
  | { ok: false; status: number; message: string };

export type AuthenticatedAdminUser = AuthenticatedUser & { role: "ADMIN" };
export type AuthenticatedHospitalUser = AuthenticatedUser & { role: "HOSPITAL"; hospitalId: number };
export type AuthenticatedEmsUser = AuthenticatedUser & { role: "EMS" };
export type AuthenticatedCaseReaderUser = AuthenticatedUser & { role: "EMS" | "ADMIN" };

export function authorizeAdminRoute(user: AuthenticatedUser | null): RouteAccessResult<AuthenticatedAdminUser> {
  if (!user) return { ok: false, status: 401, message: "Unauthorized" };
  if (user.role !== "ADMIN") return { ok: false, status: 403, message: "Forbidden" };
  return { ok: true, user: user as AuthenticatedAdminUser };
}

export function authorizeHospitalRoute(user: AuthenticatedUser | null): RouteAccessResult<AuthenticatedHospitalUser> {
  if (!user) return { ok: false, status: 401, message: "Unauthorized" };
  if (user.role !== "HOSPITAL" || !user.hospitalId) return { ok: false, status: 403, message: "Forbidden" };
  return { ok: true, user: user as AuthenticatedHospitalUser };
}

export function authorizeEmsRoute(user: AuthenticatedUser | null): RouteAccessResult<AuthenticatedEmsUser> {
  if (!user) return { ok: false, status: 401, message: "Unauthorized" };
  if (user.role !== "EMS") return { ok: false, status: 403, message: "Forbidden" };
  return { ok: true, user: user as AuthenticatedEmsUser };
}

export function authorizeCaseReaderRoute(user: AuthenticatedUser | null): RouteAccessResult<AuthenticatedCaseReaderUser> {
  if (!user) return { ok: false, status: 401, message: "Unauthorized" };
  if (!isCaseReader(user)) return { ok: false, status: 403, message: "Forbidden" };
  return { ok: true, user: user as AuthenticatedCaseReaderUser };
}
