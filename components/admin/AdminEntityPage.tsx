"use client";

import { useMemo, useState } from "react";

import {
  AdminWorkbenchMetric,
  AdminWorkbenchPage,
  AdminWorkbenchSection,
} from "@/components/admin/AdminWorkbench";
import { AdminEntityCreateForm, type AdminEntityField } from "@/components/admin/AdminEntityCreateForm";
import { AdminEntityEditor } from "@/components/admin/AdminEntityEditor";
import { AdminEntityTable } from "@/components/admin/AdminEntityTable";

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
    <AdminWorkbenchPage
      eyebrow={eyebrow}
      title={title}
      description={description}
      metrics={
        <>
          <AdminWorkbenchMetric label="TOTAL" value={rows.length} hint={`登録済み${entityLabel}数`} tone="accent" />
          <AdminWorkbenchMetric label="ACTIVE" value={activeCount} hint={`有効な${entityLabel}数`} />
          <AdminWorkbenchMetric label="LATEST" value={newestLabel} hint="最新の登録対象" />
          <AdminWorkbenchMetric label="MODE" value="MANAGE" hint="一覧と編集を同時に扱う workbench" tone="warning" />
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.95fr)]">
        <AdminWorkbenchSection
          kicker="ENTITY ROSTER"
          title={`${entityLabel}一覧`}
          description={`登録済みの${entityLabel}を比較し、編集対象を選択します。`}
        >
          <AdminEntityTable
            columns={columns}
            rows={rows}
            emptyMessage={emptyMessage}
            selectedRowId={selectedRowId}
            onSelect={setSelectedRowId}
          />
        </AdminWorkbenchSection>

        <div className="space-y-5 self-start xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto xl:pr-1">
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
    </AdminWorkbenchPage>
  );
}
