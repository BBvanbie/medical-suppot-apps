"use client";

import { signOut } from "next-auth/react";
import type { SignOutParams } from "next-auth/react";

import { clearProtectedLocalData } from "@/lib/offline/offlineRetention";

export async function secureSignOut(options?: SignOutParams<true>) {
  await clearProtectedLocalData("logout").catch(() => undefined);
  return signOut(options);
}
