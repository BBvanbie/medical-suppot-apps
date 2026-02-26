import Link from "next/link";

export default function HospitalsPage() {
  return (
    <div className="dashboard-shell min-h-screen px-8 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-[1320px] rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">HOSPITAL PORTAL</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">病院ポータル</h1>
        <p className="mt-2 text-sm text-slate-600">
          病院検索・受入可否確認など、病院側の業務機能にアクセスできます。
        </p>
        <div className="mt-5">
          <Link
            href="/hospitals/search"
            className="inline-flex h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            病院検索画面へ
          </Link>
        </div>
      </div>
    </div>
  );
}
