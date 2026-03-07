"use client";

import { useMemo, useState } from "react";

import { AdminEntityCreateForm, type AdminEntityField } from "@/components/admin/AdminEntityCreateForm";
import { AdminEntityTable } from "@/components/admin/AdminEntityTable";
import { SettingCard } from "@/components/settings/SettingCard";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";

type AdminEntityPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  entityLabel: string;
  initialRows: Array<Record<string, string | number | null>>;
  columns: Array<{ key: string; label: string }>;
  fields: AdminEntityField[];
  createEndpoint: string;
  emptyMessage: string;
  createTitle: string;
  createDescription: string;
  confirmTitle: string;
  confirmDescription: string;
  successMessage: string;
};

export function AdminEntityPage({
  eyebrow,
  title,
  description,
  entityLabel,
  initialRows,
  columns,
  fields,
  createEndpoint,
  emptyMessage,
  createTitle,
  createDescription,
  confirmTitle,
  confirmDescription,
  successMessage,
}: AdminEntityPageProps) {
  const [rows, setRows] = useState(initialRows);

  const newestLabel = useMemo(() => {
    if (rows.length === 0) return "まだ登録がありません";
    const newest = rows[0];
    const primaryColumn = columns[1]?.key ?? columns[0]?.key;
    return String(newest[primaryColumn] ?? "-");
  }, [columns, rows]);

  return (
    <SettingPageLayout eyebrow={eyebrow} title={title} description={description}>
      <section className="grid gap-4 xl:grid-cols-3">
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">TOTAL</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{rows.length}</p>
          <p className="mt-2 text-sm text-slate-500">登録済み{entityLabel}数</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">LATEST</p>
          <p className="mt-3 text-xl font-bold text-slate-900">{newestLabel}</p>
          <p className="mt-2 text-sm text-slate-500">最新の登録対象</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">POLICY</p>
          <p className="mt-3 text-sm font-semibold text-slate-900">確認付き保存</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">運用基盤に影響するため、追加前に確認ダイアログを表示します。</p>
        </SettingCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <SettingSection title={`${entityLabel}一覧`} description={`登録済みの${entityLabel}を確認できます。`}>
          <AdminEntityTable columns={columns} rows={rows} emptyMessage={emptyMessage} />
        </SettingSection>

        <AdminEntityCreateForm
          title={createTitle}
          description={createDescription}
          fields={fields}
          confirmTitle={confirmTitle}
          confirmDescription={confirmDescription}
          endpoint={createEndpoint}
          successMessage={successMessage}
          onCreated={(row) => setRows((prev) => [row, ...prev])}
        />
      </div>
    </SettingPageLayout>
  );
}
