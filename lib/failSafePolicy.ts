export type FailSafeStatus = "normal" | "degraded_db_unavailable";

export type FailSafeRole = "EMS" | "HOSPITAL" | "ADMIN" | "DISPATCH";

export type FailSafeRolePolicy = {
  role: FailSafeRole;
  canContinue: string[];
  mustStop: string[];
  operatorAction: string;
};

export const FAIL_SAFE_ROLE_POLICIES: FailSafeRolePolicy[] = [
  {
    role: "EMS",
    canContinue: [
      "端末内のオフライン事案下書き確認",
      "オフラインキューの確認",
      "電話連絡を併用した搬送先調整",
    ],
    mustStop: [
      "新規のオンライン受入要請送信",
      "搬送決定 / 搬送辞退のオンライン確定",
      "未同期データの手動削除",
    ],
    operatorAction: "復旧まで offline queue を保持し、重要案件は電話連絡で暫定運用する。",
  },
  {
    role: "HOSPITAL",
    canContinue: [
      "既に画面表示済みの要請内容の確認",
      "電話連絡による受入可否の暫定回答",
      "院内調整",
    ],
    mustStop: [
      "画面上の受入可否更新を正本として扱うこと",
      "相談コメントのオンライン送信前提の運用",
    ],
    operatorAction: "復旧まで一覧の手動更新と電話連絡を併用し、復旧後に画面上の状態を確認する。",
  },
  {
    role: "ADMIN",
    canContinue: [
      "/api/health と外部監視の確認",
      "直近リリース / DB / backup / 通知失敗の切り分け",
      "利用者への暫定運用案内",
    ],
    mustStop: [
      "DB復旧前のデータ修正操作",
      "原因未確認の再デプロイ連打",
    ],
    operatorAction: "DB復旧を優先し、incident-response と backup-restore runbook に沿って復旧判断する。",
  },
  {
    role: "DISPATCH",
    canContinue: [
      "電話や無線による指令継続",
      "復旧後入力に備えた手元記録",
    ],
    mustStop: [
      "オンライン新規事案登録を正本として扱うこと",
      "EMS / HOSPITAL へ画面通知だけで連絡した扱いにすること",
    ],
    operatorAction: "復旧まで手元記録と電話連絡を正本にし、復旧後に必要分を入力する。",
  },
];

export function getFailSafeStatus(dbOk: boolean): FailSafeStatus {
  return dbOk ? "normal" : "degraded_db_unavailable";
}
