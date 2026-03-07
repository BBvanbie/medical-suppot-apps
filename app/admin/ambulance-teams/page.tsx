import { AdminEntityPage } from "@/components/admin/AdminEntityPage";
import { listAdminAmbulanceTeams } from "@/lib/admin/adminManagementRepository";
import { ensureAdminManagementSchema } from "@/lib/admin/adminManagementSchema";

const AMBULANCE_TEAM_DIVISIONS = [
  "本部機動",
  "1方面",
  "2方面",
  "3方面",
  "4方面",
  "5方面",
  "6方面",
  "7方面",
  "8方面",
  "9方面",
  "10方面",
];

export default async function AdminAmbulanceTeamsPage() {
  await ensureAdminManagementSchema();
  const rows = await listAdminAmbulanceTeams();

  return (
    <AdminEntityPage
      eyebrow="ADMIN MANAGEMENT"
      title="救急隊管理"
      description="救急隊一覧の確認、救急隊追加、隊情報の更新、有効・無効の切替を行います。隊コードは識別子のため readOnly としています。"
      entityLabel="救急隊"
      initialRows={rows}
      columns={[
        { key: "teamCode", label: "隊コード" },
        { key: "teamName", label: "隊名" },
        { key: "division", label: "方面区分" },
        { key: "isActive", label: "状態" },
        { key: "createdAt", label: "登録日時" },
      ]}
      createFields={[
        { name: "teamCode", label: "隊コード", type: "text", required: true, placeholder: "例: EMS-101" },
        { name: "teamName", label: "隊名", type: "text", required: true, placeholder: "例: 中央1隊" },
        {
          name: "division",
          label: "方面区分",
          type: "select",
          required: true,
          options: AMBULANCE_TEAM_DIVISIONS.map((value) => ({ label: value, value })),
        },
      ]}
      editFields={[
        { name: "teamName", label: "隊名", type: "text", required: true },
        {
          name: "division",
          label: "方面区分",
          type: "select",
          required: true,
          options: AMBULANCE_TEAM_DIVISIONS.map((value) => ({ label: value, value })),
        },
      ]}
      readOnlyFields={[
        { key: "teamCode", label: "隊コード" },
        { key: "createdAt", label: "登録日時" },
      ]}
      createEndpoint="/api/admin/ambulance-teams"
      updateEndpointBase="/api/admin/ambulance-teams"
      logsEndpointBase="/api/admin/ambulance-teams"
      emptyMessage="登録済みの救急隊はまだありません。"
      createTitle="救急隊を追加"
      createDescription="新しい救急隊を追加します。登録前に内容を確認してから保存します。"
      confirmCreateTitle="救急隊を追加しますか"
      confirmCreateDescription="登録後は一覧に反映され、監査ログにも記録されます。"
      confirmUpdateTitle="救急隊情報を更新しますか"
      confirmUpdateDescription="変更内容を保存し、監査ログに記録します。"
      confirmActivateTitle="救急隊を有効化しますか"
      confirmActivateDescription="有効化すると利用対象として再度扱える状態に戻ります。"
      confirmDeactivateTitle="救急隊を無効化しますか"
      confirmDeactivateDescription="無効化すると管理上は残したまま利用停止状態にします。"
      successCreateMessage="救急隊を追加しました。"
      successUpdateMessage="救急隊情報を更新しました。"
      successActivateMessage="救急隊を有効化しました。"
      successDeactivateMessage="救急隊を無効化しました。"
    />
  );
}
