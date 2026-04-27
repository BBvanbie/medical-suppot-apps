# EMS事案詳細TRIAGE切替実装

日付: 2026-04-27

## 目的

現場到着時にEMSが事案詳細を開いたままTRIAGEモードへ切り替えられるようにし、ホームへ戻って切り替える手間をなくす。

## 変更内容

- EMS事案詳細ヘッダーに `TRIAGEへ切替` ボタンを追加する。
- 押下時は既存の `/api/settings/ambulance/operational-mode` へ `TRIAGE` を保存する。
- 保存成功後、同じ事案詳細画面を即座にTRIAGE表示へ切り替える。
- オフライン時は既存のEMS設定オフラインキューへ保存し、画面上はTRIAGE表示へ切り替える。
- TRIAGE表示へ切り替わった場合、通常時のタブからTRIAGE用タブに変わるため、表示対象外のタブにいた場合は `初動情報` へ戻す。

## 検証

- `npm run typecheck` 通過。
- `npm run check` 通過。
- `npx.cmd playwright test e2e/tests/ems-triage-mode.spec.ts --reporter=line` 通過。TRIAGE E2Eは `4 passed`。
- focused E2Eでは、既存事案詳細から `TRIAGEへ切替` を押し、TRIAGE note、本部報告ボタン、リロード後の永続化を確認した。
- 追加当初は新規テストを分けたため同一EMS userの再ログイン回数が増え、rate limitに当たった。確認は既存TRIAGE切替テストへ統合し、ログイン回数を増やさない形にした。
