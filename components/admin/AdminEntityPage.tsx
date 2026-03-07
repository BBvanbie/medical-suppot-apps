"use client";

import { useMemo, useState } from "react";

import { AdminEntityCreateForm, type AdminEntityField } from "@/components/admin/AdminEntityCreateForm";
import { AdminEntityEditor } from "@/components/admin/AdminEntityEditor";
import { AdminEntityTable } from "@/components/admin/AdminEntityTable";
import { SettingCard } from "@/components/settings/SettingCard";
import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";

type AdminEntityPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  entityLabel: string;
  initialRows: Array<Record<string, string | number | boolean | null>>;
  columns: Array<{ key: string; label: string }>;
  createFields: AdminEntityField[];
  editFields: AdminEntityField[];
  readOnlyFields: Array<{ key: string; label: string }>;
  createEndpoint: string;
  updateEndpointBase: string;
  logsEndpointBase: string;
  emptyMessage: string;
  createTitle: string;
  createDescription: string;
  confirmCreateTitle: string;
  confirmCreateDescription: string;
  confirmUpdateTitle: string;
  confirmUpdateDescription: string;
  confirmActivateTitle: string;
  confirmActivateDescription: string;
  confirmDeactivateTitle: string;
  confirmDeactivateDescription: string;
  successCreateMessage: string;
  successUpdateMessage: string;
  successActivateMessage: string;
  successDeactivateMessage: string;
};

export function AdminEntityPage({
  eyebrow,
  title,
  description,
  entityLabel,
  initialRows,
  columns,
  createFields,
  editFields,
  readOnlyFields,
  createEndpoint,
  updateEndpointBase,
  logsEndpointBase,
  emptyMessage,
  createTitle,
  createDescription,
  confirmCreateTitle,
  confirmCreateDescription,
  confirmUpdateTitle,
  confirmUpdateDescription,
  confirmActivateTitle,
  confirmActivateDescription,
  confirmDeactivateTitle,
  confirmDeactivateDescription,
  successCreateMessage,
  successUpdateMessage,
  successActivateMessage,
  successDeactivateMessage,
}: AdminEntityPageProps) {
  const [rows, setRows] = useState(initialRows);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(initialRows[0]?.id ? Number(initialRows[0].id) : null);

  const selectedRow = useMemo(() => rows.find((row) => Number(row.id) === selectedRowId) ?? null, [rows, selectedRowId]);
  const newestLabel = useMemo(() => {
    if (rows.length === 0) return "まだ登録がありません";
    const newest = rows[0];
    const primaryColumn = columns[1]?.key ?? columns[0]?.key;
    return String(newest[primaryColumn] ?? "-");
  }, [columns, rows]);
  const activeCount = useMemo(() => rows.filter((row) => row.isActive === true).length, [rows]);

  return (
    <SettingPageLayout eyebrow={eyebrow} title={title} description={description}>
      <section className="grid gap-4 xl:grid-cols-3">
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">TOTAL</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{rows.length}</p>
          <p className="mt-2 text-sm text-slate-500">登録済み{entityLabel}数</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">ACTIVE</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{activeCount}</p>
          <p className="mt-2 text-sm text-slate-500">有効な{entityLabel}数</p>
        </SettingCard>
        <SettingCard className="border-slate-200 bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">LATEST</p>
          <p className="mt-3 text-xl font-bold text-slate-900">{newestLabel}</p>
          <p className="mt-2 text-sm text-slate-500">最新の登録対象</p>
        </SettingCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.95fr)]">
        <SettingSection title={`${entityLabel}一覧`} description={`登録済みの${entityLabel}を確認し、編集対象を選択できます。`}>
          <AdminEntityTable columns={columns} rows={rows} emptyMessage={emptyMessage} selectedRowId={selectedRowId} onSelect={setSelectedRowId} />
        </SettingSection>

        <div className="space-y-6">
          <AdminEntityCreateForm
            title={createTitle}
            description={createDescription}
            fields={createFields}
            confirmTitle={confirmCreateTitle}
            confirmDescription={confirmCreateDescription}
            endpoint={createEndpoint}
            successMessage={successCreateMessage}
            onCreated={(row) => {
              setRows((prev) => [row, ...prev]);
              setSelectedRowId(Number(row.id));
            }}
          />

          <AdminEntityEditor
            key={selectedRowId ?? "empty"}
            entityLabel={entityLabel}
            selectedRow={selectedRow}
            readOnlyFields={readOnlyFields}
            editFields={editFields}
            updateEndpointBase={updateEndpointBase}
            logsEndpointBase={logsEndpointBase}
            confirmUpdateTitle={confirmUpdateTitle}
            confirmUpdateDescription={confirmUpdateDescription}
            confirmActivateTitle={confirmActivateTitle}
            confirmActivateDescription={confirmActivateDescription}
            confirmDeactivateTitle={confirmDeactivateTitle}
            confirmDeactivateDescription={confirmDeactivateDescription}
            successUpdateMessage={successUpdateMessage}
            successActivateMessage={successActivateMessage}
            successDeactivateMessage={successDeactivateMessage}
            onUpdated={(row) => setRows((prev) => prev.map((current) => (Number(current.id) === Number(row.id) ? row : current)))}
          />
        </div>
      </div>
    </SettingPageLayout>
  );
}
