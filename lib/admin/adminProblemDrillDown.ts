export type AdminProblemKey = "selection_stalled" | "consult_stalled" | "reply_delay";

export const ADMIN_PROBLEM_DRILL_DOWN = {
  selection_stalled: {
    key: "selection_stalled",
    label: "選定停滞",
    description: "搬送決定まで止まっている案件を確認",
    monitorDescription: "搬送決定まで止まっている案件を開きます。",
    chipClassName: "bg-rose-50 text-rose-700",
    nextAction: "選定履歴と候補病院の停滞点を確認",
  },
  consult_stalled: {
    key: "consult_stalled",
    label: "要相談停滞",
    description: "相談継続のまま止まっている案件を確認",
    monitorDescription: "相談継続のまま止まっている案件を開きます。",
    chipClassName: "bg-blue-50 text-blue-700",
    nextAction: "相談履歴と直近コメント差分を確認",
  },
  reply_delay: {
    key: "reply_delay",
    label: "返信遅延",
    description: "既読後の未返信案件を確認",
    monitorDescription: "既読後に返信が止まっている案件を開きます。",
    chipClassName: "bg-amber-50 text-amber-700",
    nextAction: "未返信病院と経過時間を確認",
  },
} as const satisfies Record<AdminProblemKey, {
  key: AdminProblemKey;
  label: string;
  description: string;
  monitorDescription: string;
  chipClassName: string;
  nextAction: string;
}>;

export function getAdminProblemMeta(problem: string | null | undefined) {
  if (!problem) return null;
  if (problem in ADMIN_PROBLEM_DRILL_DOWN) {
    return ADMIN_PROBLEM_DRILL_DOWN[problem as AdminProblemKey];
  }
  return null;
}
