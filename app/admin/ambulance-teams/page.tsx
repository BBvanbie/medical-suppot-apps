import { AdminEntityPage } from "@/components/admin/AdminEntityPage";
import { listAdminAmbulanceTeams } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";

export default async function AdminAmbulanceTeamsPage() {
  await ensureAdminManagementSchema();
  const rows = await listAdminAmbulanceTeams();

  return (
    <AdminEntityPage
      eyebrow="ADMIN MANAGEMENT"
      title="救急隊管理"
      description="救急隊一覧の確認と新規追加を行います。端末紐付けや状態管理は後続フェーズで追加します。"
      entityLabel="救急隊"
      initialRows={rows}
      columns={[
        { key: "teamCode", label: "隊コード" },
        { key: "teamName", label: "隊名" },
        { key: "division", label: "所属部" },
        { key: "createdAt", label: "登録日時" },
      ]}
      fields={[
        { name: "teamCode", label: "隊コード", type: "text", required: true, placeholder: "例: EMS-101" },
        { name: "teamName", label: "隊名", type: "text", required: true, placeholder: "例: 千代田救急1隊" },
        {
          name: "division",
          label: "所属部",
          type: "select",
          required: true,
          options: [
            { label: "1部", value: "1部" },
            { label: "2部", value: "2部" },
            { label: "3部", value: "3部" },
          ],
        },
      ]}
      createEndpoint="/api/admin/ambulance-teams"
      emptyMessage="登録済みの救急隊はまだありません。"
      createTitle="救急隊を追加"
      createDescription="隊コードの重複は許可せず、登録内容は監査ログに記録します。"
      confirmTitle="救急隊を追加しますか"
      confirmDescription="登録後は管理一覧に反映され、運用基盤データとして扱われます。"
      successMessage="救急隊を追加しました。"
    />
  );
}
