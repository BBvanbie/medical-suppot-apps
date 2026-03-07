import { AdminEntityPage } from "@/components/admin/AdminEntityPage";
import { listAdminHospitals } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";

export default async function AdminHospitalsPage() {
  await ensureAdminManagementSchema();
  const rows = await listAdminHospitals();

  return (
    <AdminEntityPage
      eyebrow="ADMIN MANAGEMENT"
      title="病院管理"
      description="病院一覧の確認、病院追加、基本情報の更新、有効・無効の切替を行います。識別子の変更は危険度が高いため、初回実装では編集対象から除外しています。"
      entityLabel="病院"
      initialRows={rows}
      columns={[
        { key: "sourceNo", label: "施設コード" },
        { key: "name", label: "病院名" },
        { key: "municipality", label: "自治体" },
        { key: "phone", label: "電話番号" },
        { key: "isActive", label: "状態" },
      ]}
      createFields={[
        { name: "sourceNo", label: "施設コード", type: "number", required: true, placeholder: "例: 1001" },
        { name: "name", label: "病院名", type: "text", required: true, placeholder: "例: 中央市民病院" },
        { name: "municipality", label: "自治体", type: "text", placeholder: "例: 中央市" },
        { name: "postalCode", label: "郵便番号", type: "text", placeholder: "例: 100-0001" },
        { name: "address", label: "住所", type: "text", placeholder: "例: 東京都中央区1-2-3" },
        { name: "phone", label: "電話番号", type: "tel", placeholder: "例: 03-1234-5678" },
      ]}
      editFields={[
        { name: "name", label: "病院名", type: "text", required: true },
        { name: "municipality", label: "自治体", type: "text" },
        { name: "postalCode", label: "郵便番号", type: "text" },
        { name: "address", label: "住所", type: "text" },
        { name: "phone", label: "電話番号", type: "tel" },
      ]}
      readOnlyFields={[
        { key: "sourceNo", label: "施設コード" },
        { key: "createdAt", label: "登録日時" },
      ]}
      createEndpoint="/api/admin/hospitals"
      updateEndpointBase="/api/admin/hospitals"
      logsEndpointBase="/api/admin/hospitals"
      emptyMessage="登録済みの病院はまだありません。"
      createTitle="病院を追加"
      createDescription="新しい病院を追加します。登録前に内容を確認してから保存します。"
      confirmCreateTitle="病院を追加しますか"
      confirmCreateDescription="登録後は一覧に反映され、監査ログにも記録されます。"
      confirmUpdateTitle="病院情報を更新しますか"
      confirmUpdateDescription="変更内容を保存し、監査ログに記録します。"
      confirmActivateTitle="病院を有効化しますか"
      confirmActivateDescription="有効化すると一覧上で利用可能な状態に戻ります。"
      confirmDeactivateTitle="病院を無効化しますか"
      confirmDeactivateDescription="無効化すると管理上は残したまま利用停止状態にします。"
      successCreateMessage="病院を追加しました。"
      successUpdateMessage="病院情報を更新しました。"
      successActivateMessage="病院を有効化しました。"
      successDeactivateMessage="病院を無効化しました。"
    />
  );
}
