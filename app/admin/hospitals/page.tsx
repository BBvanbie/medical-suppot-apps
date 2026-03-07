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
      description="病院一覧の確認と新規追加を行います。編集や履歴管理は後続フェーズで追加します。"
      entityLabel="病院"
      initialRows={rows}
      columns={[
        { key: "sourceNo", label: "施設コード" },
        { key: "name", label: "病院名" },
        { key: "municipality", label: "自治体" },
        { key: "address", label: "住所" },
        { key: "phone", label: "電話番号" },
      ]}
      fields={[
        { name: "sourceNo", label: "施設コード", type: "number", required: true, placeholder: "例: 1001" },
        { name: "name", label: "病院名", type: "text", required: true, placeholder: "例: 千代田総合病院" },
        { name: "municipality", label: "自治体", type: "text", placeholder: "例: 千代田区" },
        { name: "postalCode", label: "郵便番号", type: "text", placeholder: "例: 100-0001" },
        { name: "address", label: "住所", type: "text", placeholder: "例: 東京都千代田区1-2-3" },
        { name: "phone", label: "電話番号", type: "tel", placeholder: "例: 03-1234-5678" },
      ]}
      createEndpoint="/api/admin/hospitals"
      emptyMessage="登録済みの病院はまだありません。"
      createTitle="病院を追加"
      createDescription="組織影響のある変更として確認ダイアログを挟んで登録します。"
      confirmTitle="病院を追加しますか"
      confirmDescription="登録後は管理一覧に反映され、監査ログにも記録されます。"
      successMessage="病院を追加しました。"
    />
  );
}
