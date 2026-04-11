"use client";

import { FormEvent, useState } from "react";

import { secureSignOut } from "@/lib/secureSignOut";

export function ChangePasswordCard({ forced = false }: { forced?: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/security/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "パスワード変更に失敗しました。");
        return;
      }

      setMessage("パスワードを変更しました。再ログインします。");
      await secureSignOut({ callbackUrl: "/login" });
    } catch {
      setError("通信に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="content-card content-card--spacious w-full max-w-md">
      <p className="portal-eyebrow portal-eyebrow--ems">PASSWORD CHANGE</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">パスワード変更</h1>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        {forced
          ? "一時パスワードでログインしているため、この場で新しいパスワードへ変更する必要があります。"
          : "現在のパスワードを確認し、新しいパスワードへ変更します。"}
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">現在のパスワード</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">新しいパスワード</span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">新しいパスワード確認</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </label>
        {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {message ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "変更中..." : "パスワードを変更"}
        </button>
      </form>
    </section>
  );
}
