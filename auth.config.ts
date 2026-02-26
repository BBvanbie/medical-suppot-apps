import { compare } from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { isAppRole } from "@/lib/auth";

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  display_name: string;
};

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "ユーザー名", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");

        if (!username || !password) return null;

        const result = await db.query<UserRow>(
          `
            SELECT id, username, password_hash, role, display_name
            FROM users
            WHERE username = $1
              AND is_active = TRUE
            LIMIT 1
          `,
          [username],
        );

        const user = result.rows[0];
        if (!user || !isAppRole(user.role)) return null;

        const isValidPassword = await compare(password, user.password_hash);
        if (!isValidPassword) return null;

        await db
          .query(
            `
              UPDATE users
              SET last_login_at = NOW(), updated_at = NOW()
              WHERE id = $1
            `,
            [user.id],
          )
          .catch(() => undefined);

        return {
          id: String(user.id),
          name: user.display_name,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const mutableToken = token as typeof token & {
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
        };
        user.id = (token as { userId?: string }).userId;
        user.role = (token as { role?: string }).role;
        user.username = (token as { username?: string }).username;
        user.displayName = (token as { displayName?: string }).displayName;
        session.user.name = user.displayName ?? session.user.name;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
