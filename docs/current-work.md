# 現在作業中の統合実装計画

最終更新: 2026-03-31

この文書を、現在進行中の実装を再開するための正本とする。
次回はまずこの文書を開き、ここに書かれた最優先タスク、次アクション、参照先から着手する。
日付付き plan は履歴と詳細判断、`docs/workstreams/` はテーマ別整理として扱い、本書を唯一の再開ハブにする。

## 0. 作業開始テンプレート

次回この作業を開始するときは、まずこの文書を開いたうえで次の文言を使う。

開始文言:

`docs/current-work.md の 3. 次回実施すること から再開してください。今回は最優先の「認可共通化の残り」から進め、必要な docs 更新、実装、check、関連 E2E まで実施してください。通知運用、オフライン競合、未送信キュー回復導線は完了扱いで進めてください。`

最初の確認コマンド:

```powershell
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\current-work.md"
```

必要に応じた初手コマンド:

```powershell
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\system-spec-2026-03-29.md"
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\workstreams\authorization.md"
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\workstreams\notifications.md"
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\workstreams\offline.md"
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\plans\README.md"
```

## 1. 参照元

- 統合仕様書: [system-spec-2026-03-29.md](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md)
- workstream 一覧: [README.md](/C:/practice/medical-support-apps/docs/workstreams/README.md)
- 認可: [authorization.md](/C:/practice/medical-support-apps/docs/workstreams/authorization.md)
- 通知: [notifications.md](/C:/practice/medical-support-apps/docs/workstreams/notifications.md)
- オフライン: [offline.md](/C:/practice/medical-support-apps/docs/workstreams/offline.md)
- Phase 2: [phase2.md](/C:/practice/medical-support-apps/docs/workstreams/phase2.md)
- plan 一覧: [README.md](/C:/practice/medical-support-apps/docs/plans/README.md)

## 2. 方針

- 単なる機能追加より先に、安全性、整合性、競合制御を固める
- 実装順は、レビューで示された優先順位を基準にする
- 完了済みの項目は「完了済み」へ移し、次回対象だけを上段に残す
- 1 回の作業で完了しない内容は、追加するものと整理するものに分けて明示する
- 本書と関連 workstream を、次回開始時に迷わない粒度まで更新してから作業を閉じる

## 3. 次回実施すること

優先順位順です。上から着手します。

### 3-1. 追加するもの

1. 認可共通化の残り
   - `cases` / `hospitals` / `admin` 配下で、まだ個別認可が残る API を共通 helper に寄せる
   - ページ表示可否と API 実行可否の別表を仕様書へ追加する

2. 追加 E2E
   - 他隊事案アクセス拒否
   - 他院 target 更新拒否
   - 二重搬送決定競合
   - 終端状態の再遷移拒否
   - 通知重複抑止

3. Phase 2 設計
   - 検索順位スコアリング
   - 未対応長時間放置アラート
   - 運用監視指標の定義

### 3-2. 直近の次アクション

次に始める作業は「認可共通化の残り」です。着手順は以下を基準にします。

1. [`caseAccess.ts`](/C:/practice/medical-support-apps/lib/caseAccess.ts) と `app/api/cases/*` / `app/api/hospitals/*` / `app/api/admin/*` の個別認可残りを棚卸しする
2. 共通 helper へ寄せる対象 API を小さく切って、認可 workstream と必要な plan を更新する
3. 認可 helper 化した API から順に E2E を追加する
4. [`system-spec-2026-03-29.md`](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md) にページ表示可否と API 実行可否の別表を追記する

### 3-3. 整理するもの

- 統合仕様書に以下を追記する
  - 排他制御方針
  - 終端状態の扱い
  - 認可共通化方針
  - 監査ログ標準項目
  - 通知の重複抑止 / 再通知 / 期限
  - DB 制約一覧
  - API エラーコード一覧
- ロール別権限表、画面別操作権限表、通知マトリクス、オフライン対象データ一覧を後続 docs として整理する

## 4. workstream 状態

### 4-1. 進行中

- 認可共通化
  - 状態: 進行中
  - 参照: [authorization.md](/C:/practice/medical-support-apps/docs/workstreams/authorization.md)
- 追加 E2E
  - 状態: 進行中
  - 参照: [authorization.md](/C:/practice/medical-support-apps/docs/workstreams/authorization.md), [notifications.md](/C:/practice/medical-support-apps/docs/workstreams/notifications.md)
- Phase 2
  - 状態: 未着手
  - 参照: [phase2.md](/C:/practice/medical-support-apps/docs/workstreams/phase2.md)

### 4-2. 完了済み

- 通知運用項目実装
- オフライン競合解決仕様の明文化
- 未送信キューの失敗理由分類と回復導線追加
- 競合時の最小 UI 表示追加
- 認可共通化の土台追加
- 主要 target API の共通ガード移行
- `TRANSPORT_DECIDED` の終端化
- 搬送決定の二重決定防止と競合検知
- 監査ログ標準項目の最小追加
- setup / E2E 用 SQL の重複整理と unique 制約安全化

## 5. 直近の確認結果

- `npm run check` 通過
- `npm run check:full` 通過
- `npx.cmd playwright test e2e/tests/hospital-flows.spec.ts e2e/tests/dispatch-flows.spec.ts e2e/tests/cases-access.spec.ts` 通過
- `npx.cmd playwright test e2e/tests/ems-offline.spec.ts` 通過
- `npx.cmd playwright test e2e/tests/ems-offline.spec.ts --grep "retry all|conflict restore notice"` 通過
- `npx.cmd playwright test e2e/tests/hospital-flows.spec.ts --grep "operational notifications|consult comment emits EMS notification"` は追加・実行済み
  - 初回実行で通知 dedupe race を検出し修正済み
  - 再実行はローカル Next.js / Playwright 環境の不安定化で完走未確認

## 6. 再開時にまず見るファイル

- 認可 helper: [caseAccess.ts](/C:/practice/medical-support-apps/lib/caseAccess.ts)
- 搬送判断: [sendHistoryStatusRepository.ts](/C:/practice/medical-support-apps/lib/sendHistoryStatusRepository.ts)
- 監査ログ: [auditLog.ts](/C:/practice/medical-support-apps/lib/auditLog.ts)
- 通知仕様の土台: [route.ts](/C:/practice/medical-support-apps/app/api/notifications/route.ts)
- hospital request schema: [hospitalRequestSchema.ts](/C:/practice/medical-support-apps/lib/hospitalRequestSchema.ts)
- オフライン同期: [offlineSync.ts](/C:/practice/medical-support-apps/lib/offline/offlineSync.ts)
- setup SQL: [setup_hospital_requests.sql](/C:/practice/medical-support-apps/scripts/setup_hospital_requests.sql)
- E2E setup: [global-setup.ts](/C:/practice/medical-support-apps/e2e/global-setup.ts)

## 7. 運用メモ

- 重大な削除破壊的操作以外は事前承認済みの運用
- 日本語テキストと改行を壊さないことを優先する
- `hospital_patients(case_uid)` の unique 制約は、重複掃除後に張る前提
- 次回は本書の `3. 次回実施すること` から再開する
- オフライン競合は `手動解決`、`server優先`、`事案フォーム再保存` を前提とする
