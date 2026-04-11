import { compare } from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { isAppRole } from "@/lib/auth";
import {
  getDeviceTrustStateForUser,
  getSecurityUserById,
  isLoginLocked,
  recordFailedLoginAttempt,
  recordSuccessfulLoginAttempt,
} from "@/lib/securityAuthRepository";
import { consumeRateLimit } from "@/lib/rateLimit";
import { ensureSecurityAuthSchema } from "@/lib/securityAuthSchema";
import { isMfaRequiredForRole } from "@/lib/mfaPolicy";

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  display_name: string;
  team_id: number | null;
  hospital_id: number | null;
  session_version: number;
  must_change_password: boolean;
  temporary_password_expires_at: Date | string | null;
};

const SESSION_MAX_AGE_SECONDS = 5 * 60 * 60;

async function hasActiveMfaCredential(userId: number) {
  const result = await db.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM user_mfa_credentials
        WHERE user_id = $1
          AND revoked_at IS NULL
      ) AS exists
    `,
    [userId],
  );
  return Boolean(result.rows[0]?.exists);
}

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "ユーザー名", type: "text" },
        password: { label: "パスワード", type: "password" },
        deviceKey: { label: "端末キー", type: "text" },
      },
      async authorize(credentials, request) {
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");
        const deviceKey = String(credentials?.deviceKey ?? "").trim();

        if (!username || !password) return null;
        await ensureSecurityAuthSchema();

        const rateLimit = await consumeRateLimit({
          policyName: "login",
          routeKey: "auth.login",
          request,
          username,
        }).catch(() => ({ ok: true as const, limit: 0, windowSeconds: 0, retryAfterSeconds: 0 }));
        if (!rateLimit.ok) {
          await recordFailedLoginAttempt(username, request, "rate_limited");
          return null;
        }

        const lockedUntil = await isLoginLocked(username);
        if (lockedUntil) {
          await recordFailedLoginAttempt(username, request, "locked");
          return null;
        }

        const result = await db.query<UserRow>(
          `
            SELECT id, username, password_hash, role, display_name, team_id, hospital_id, session_version, must_change_password, temporary_password_expires_at
            FROM users
            WHERE username = $1
              AND is_active = TRUE
            LIMIT 1
          `,
          [username],
        );

        const user = result.rows[0];
        if (!user || !isAppRole(user.role)) {
          await recordFailedLoginAttempt(username, request);
          return null;
        }

        const isValidPassword = await compare(password, user.password_hash);
        if (!isValidPassword) {
          await recordFailedLoginAttempt(username, request);
          return null;
        }

        const temporaryPasswordExpiresAt = user.temporary_password_expires_at
          ? new Date(user.temporary_password_expires_at)
          : null;
        if (user.must_change_password && temporaryPasswordExpiresAt && temporaryPasswordExpiresAt.getTime() <= Date.now()) {
          await recordFailedLoginAttempt(username, request, "temporary_password_expired");
          return null;
        }

        await recordSuccessfulLoginAttempt(user.id, user.username, request).catch(() => undefined);

        return {
          id: String(user.id),
          name: user.display_name,
          username: user.username,
          role: user.role,
          teamId: user.team_id,
          hospitalId: user.hospital_id,
          deviceKey,
          sessionVersion: user.session_version,
          mustChangePassword: user.must_change_password,
          temporaryPasswordExpiresAt:
            user.temporary_password_expires_at instanceof Date
              ? user.temporary_password_expires_at.toISOString()
              : user.temporary_password_expires_at,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const mutableToken = token as typeof token & {
        authExpired?: boolean;
        authInvalidated?: boolean;
        authenticatedAt?: number;
        authLevel?: string;
        deviceEnforcementRequired?: boolean;
        deviceKey?: string;
        deviceTrusted?: boolean;
        mfaEnrolled?: boolean;
        mfaRequired?: boolean;
        mfaVerifiedAt?: number;
        mustChangePassword?: boolean;
        sessionVersion?: number;
        teamId?: number | null;
        hospitalId?: number | null;
        userId?: string;
        role?: string;
        username?: string;
        displayName?: string;
      };

      if (user) {
        mutableToken.userId = user.id;
        mutableToken.role = (user as { role?: string }).role;
        mutableToken.username = (user as { username?: string }).username;
        mutableToken.displayName = user.name ?? "";
        mutableToken.teamId = (user as { teamId?: number | null }).teamId ?? null;
        mutableToken.hospitalId = (user as { hospitalId?: number | null }).hospitalId ?? null;
        mutableToken.deviceKey = (user as { deviceKey?: string }).deviceKey ?? "";
        mutableToken.sessionVersion = (user as { sessionVersion?: number }).sessionVersion;
        mutableToken.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false;
        mutableToken.authenticatedAt = Date.now();
        mutableToken.authExpired = false;
        mutableToken.authInvalidated = false;
        mutableToken.mfaRequired = isMfaRequiredForRole((user as { role?: string }).role);
        mutableToken.mfaVerifiedAt = undefined;
        mutableToken.authLevel = mutableToken.mfaRequired ? "password" : "full";
      }

      if (trigger === "update" && session) {
        const update = session as {
          mfaVerifiedAt?: number;
        };
        if (typeof update.mfaVerifiedAt === "number") {
          mutableToken.mfaVerifiedAt = update.mfaVerifiedAt;
          mutableToken.authLevel = "full";
        }
      }

      if (mutableToken.userId) {
        const authenticatedAt = Number(mutableToken.authenticatedAt ?? 0);
        if (authenticatedAt > 0 && Date.now() - authenticatedAt > SESSION_MAX_AGE_SECONDS * 1000) {
          mutableToken.authExpired = true;
          return token;
        }

        const currentUser = await getSecurityUserById(Number(mutableToken.userId)).catch(() => null);
        if (!currentUser || !isAppRole(currentUser.role) || !currentUser.is_active) {
          mutableToken.authInvalidated = true;
          return token;
        }

        if (currentUser.session_version !== mutableToken.sessionVersion) {
          mutableToken.authInvalidated = true;
          return token;
        }

        mutableToken.role = currentUser.role;
        mutableToken.username = currentUser.username;
        mutableToken.displayName = currentUser.display_name;
        mutableToken.mustChangePassword = currentUser.must_change_password;
        mutableToken.mfaRequired = isMfaRequiredForRole(currentUser.role);
        mutableToken.mfaEnrolled = mutableToken.mfaRequired ? await hasActiveMfaCredential(currentUser.id).catch(() => false) : false;
        if (!mutableToken.mfaRequired) {
          mutableToken.authLevel = "full";
        } else if (mutableToken.mfaVerifiedAt) {
          mutableToken.authLevel = "full";
        } else {
          mutableToken.authLevel = "password";
        }

        const trustState = await getDeviceTrustStateForUser({
          userId: currentUser.id,
          role: currentUser.role,
          teamId: currentUser.team_id ?? null,
          hospitalId: currentUser.hospital_id ?? null,
          deviceKey: mutableToken.deviceKey,
        }).catch(() => ({
          deviceTrusted: false,
          deviceEnforcementRequired: false,
          deviceName: null,
        }));
        mutableToken.deviceTrusted = trustState.deviceTrusted;
        mutableToken.deviceEnforcementRequired = trustState.deviceEnforcementRequired;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as {
          id?: string;
          role?: string;
          username?: string;
          displayName?: string;
          authExpired?: boolean;
          authInvalidated?: boolean;
          deviceEnforcementRequired?: boolean;
          deviceTrusted?: boolean;
          mustChangePassword?: boolean;
          mfaEnrolled?: boolean;
          mfaRequired?: boolean;
          mfaVerified?: boolean;
          authLevel?: string;
        };
        user.id = (token as { userId?: string }).userId;
        user.role = (token as { role?: string }).role;
        user.username = (token as { username?: string }).username;
        user.displayName = (token as { displayName?: string }).displayName;
        user.authExpired = (token as { authExpired?: boolean }).authExpired;
        user.authInvalidated = (token as { authInvalidated?: boolean }).authInvalidated;
        user.deviceEnforcementRequired = (token as { deviceEnforcementRequired?: boolean }).deviceEnforcementRequired;
        user.deviceTrusted = (token as { deviceTrusted?: boolean }).deviceTrusted;
        user.mustChangePassword = (token as { mustChangePassword?: boolean }).mustChangePassword;
        user.mfaRequired = (token as { mfaRequired?: boolean }).mfaRequired;
        user.mfaEnrolled = (token as { mfaEnrolled?: boolean }).mfaEnrolled;
        user.mfaVerified = Boolean((token as { mfaVerifiedAt?: number }).mfaVerifiedAt);
        user.authLevel = (token as { authLevel?: string }).authLevel;
        session.user.name = user.displayName ?? session.user.name;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
