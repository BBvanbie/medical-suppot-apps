"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { FormEvent, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { isAppRole, resolvePostLoginPath } from "@/lib/auth";

type LoginFormProps = {
  callbackUrl: string | null;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("ユーザー名またはパスワードが正しくありません。");
        return;
      }

      const session = await getSession();
      const role = (session?.user as { role?: string } | undefined)?.role;

      if (!role || !isAppRole(role)) {
        setError("ログイン情報の取得に失敗しました。");
        return;
      }

      const destination = resolvePostLoginPath(role, callbackUrl);
      router.replace(destination);
      router.refresh();
    } catch {
      setError("ログイン処理中にエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-800" htmlFor="username">
          ユーザー名
        </label>
        <input
          id="username"
          name="username"
          data-testid="login-username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-800" htmlFor="password">
          パスワード
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            data-testid="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-11 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
          <button
            type="button"
            aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xl text-slate-500 transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {showPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden /> : <EyeIcon className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        data-testid="login-submit"
        disabled={isSubmitting}
        className="h-11 w-full cursor-pointer rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
