export default function AdminPage() {
  return (
    <div className="dashboard-shell min-h-screen px-8 py-6 text-slate-900">
      <div className="mx-auto w-full max-w-[1320px] rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">ADMIN</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">管理者ポータル</h1>
        <p className="mt-2 text-sm text-slate-600">
          ユーザー管理・監査ログ・システム設定はこの画面に順次実装します。
        </p>
      </div>
    </div>
  );
}
