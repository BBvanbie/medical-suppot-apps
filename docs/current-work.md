# 現在作業中の統合実装計画

最終更新: 2026-04-05

この文書を、現在進行中の実装を再開するための正本とする。
次回はまずこの文書を開き、ここに書かれた最優先タスク、次アクション、参照先から着手する。
日付付き plan は履歴と詳細判断、`docs/workstreams/` はテーマ別整理として扱い、本書を唯一の再開ハブにする。

## 0. 作業開始テンプレート

次回この作業を開始するときは、まずこの文書を開いたうえで次の文言を使う。

開始文言:

`docs/current-work.md の 3. 次回実施すること から再開してください。design system 導入テーマとして進め、2026-04-05-design-system-policy-design.md と docs/UI_RULES.md を踏まえて Phase 2 の pattern 整理へ入ってください。Phase 1 の token / primitive / page-level 横展開は完了済みとして扱い、一覧 / 詳細 / overlay / KPI の pattern 抽出から着手してください。offline diff/automerge は保留継続済みとして扱ってください。`

最初の確認コマンド:

```powershell
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\current-work.md"
```

必要に応じた初手コマンド:

```powershell
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\plans\2026-04-05-design-system-policy-design.md"
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\UI_RULES.md"
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
- design system 方針書: [2026-04-05-design-system-policy-design.md](/C:/practice/medical-support-apps/docs/plans/2026-04-05-design-system-policy-design.md)
- 現行 UI ルール: [UI_RULES.md](/C:/practice/medical-support-apps/docs/UI_RULES.md)
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

1. design system 導入 Phase 1
   - 完了
   - 方針書初版、`UI_RULES` 再編、最小 token / primitive 導入、shell / workbench / field / table、shared modal / notification、主要 settings / admin / hospital / dispatch / case form の one-off class 整理まで完了
2. オフライン差分比較 UI / 自動マージ
   - 現時点では保留判断済み
   - `server payload snapshot` を持てるまでは着手しない

### 3-2. 直近の次アクション

次に始める作業は「design system Phase 2 の pattern 整理」です。着手順は以下を基準にします。

1. 方針の正本を維持する
   - [2026-04-05-design-system-policy-design.md](/C:/practice/medical-support-apps/docs/plans/2026-04-05-design-system-policy-design.md) を design system 方針書初版として扱う
   - [UI_RULES.md](/C:/practice/medical-support-apps/docs/UI_RULES.md) は `Foundations / Components / Patterns / Tools` 再編済みの正本として扱う
2. Phase 1 完了済みの foundations / primitive を基準化する
   - foundations:
     - `app/globals.css`
     - `ds token` 命名
     - status color / focus / spacing / elevation の基準
   - primitive:
     - `RequestStatusBadge`
     - `ConfirmDialog`
     - `SettingActionButton`
     - shared loading 系
3. 次の Phase 2 対象を切り出す
   - pattern seed:
     - 一覧
     - 一覧 + 詳細
     - detail dialog / drawer
     - KPI + backlog
   - component seed:
     - table header / row / paging
     - metadata rail
     - action footer
4. 直近の実装対象
   - token ベースで揃った page 群から pattern 共通化候補を抽出する
   - role 別 shell 差を残したまま、一覧 / 詳細 / overlay / KPI の再利用境界を決める
   - 既存画面の全面リライトではなく、component / pattern 単位で束ねる
5. bulk dataset の再回帰が必要な場合のみ、以下のコマンド列から再開する

bulk dataset を使った回帰をもう一度回す必要がある場合は次の順で再開する。

1. `node scripts/manage_case_load_test_data.js verify --expected 100`
2. `npx.cmd playwright test e2e/tests/bulk-case-views.spec.ts`
3. `npx.cmd playwright test e2e/tests/bulk-case-mutations.spec.ts`
4. 必要なら mutation 実行後に baseline へ戻す
   - `node scripts/manage_case_load_test_data.js reset`
   - `node scripts/manage_case_load_test_data.js seed --count 100`
   - `node scripts/manage_case_load_test_data.js verify --expected 100`

次回開始文言:

`docs/current-work.md の 3-2 を起点に、design system Phase 2 として再開してください。Phase 1 の token / primitive / page-level 横展開は完了しているので、次は一覧 / 詳細 / overlay / KPI の pattern 抽出と component 境界整理へ進んでください。`

### 3-3. 整理するもの

- `search score snapshot` は Phase 2 では見送り済み
  - 採用率 KPI を正式化する時点で送信履歴 payload と DB 保存先を同時設計する
- design system Phase 1 は完了
  - 次は token ベースで揃った page 群をもとに、pattern 単位の共通化へ進む
- Phase 2 で固定した画面指標は統合仕様書へ反映済み
  - EMS: 覚知〜初回照会、送信〜搬送決定、再送信率、相談移行率
  - HOSPITAL: backlog、科別依頼、相談後受入、受信〜既読、既読〜返信
  - ADMIN: 搬送決定率、難渋、未対応滞留、病院平均返信、地域別決定時間
- 未着手 backlog は次の優先順で扱う
  1. design system の phase 1 導入
     - 完了
  2. オフライン差分比較 UI / 自動マージ
     - `baseServerUpdatedAt` 比較のみで競合検知しているため、`server payload snapshot` を持つまでは保留

## 4. workstream 状態

### 4-1. 進行中

- 認可共通化
  - 状態: 完了
  - 参照: [authorization.md](/C:/practice/medical-support-apps/docs/workstreams/authorization.md)
- 追加 E2E
  - 状態: 完了
  - 参照: [authorization.md](/C:/practice/medical-support-apps/docs/workstreams/authorization.md), [notifications.md](/C:/practice/medical-support-apps/docs/workstreams/notifications.md)
- Phase 2
  - 状態: 完了
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
- 認可共通化の残り
- ページ表示可否と API 実行可否の別表追加
- 他隊事案アクセス拒否 E2E
- 他院 target 更新拒否 E2E
- 二重搬送決定競合 E2E
- 終端状態の再遷移拒否 E2E
- Search score server-side 算出
- 病院検索結果の score 順表示
- Search score 理由表示 E2E
- stalled alert 共通候補抽出
- EMS / HOSPITAL 通知への stalled alert 追加
- Admin dashboard stalled alert 追加
- stalled alert focused E2E
- Phase 2 metrics 実装
- dashboard KPI の定義整理
- `search score snapshot` 見送り判断
- 統合仕様書の未整理項目反映
- ロール別権限表の切り出し
- 画面別操作権限表の切り出し
- 通知マトリクスの切り出し
- オフライン対象データ一覧の切り出し
- 通知運用 E2E の追確認
- オフライン競合導線の強化
- `server優先で破棄` の focused E2E 追加
- オフライン差分比較 UI / 自動マージの保留判断
- docs の最終整形
- role 横断の shell / loading / settings detail UI polishing
- dispatch / settings role shell focused E2E
- 追加の回帰 E2E 要否確認
- 100件 bulk seed と role 別 bulk UI/E2E
- 100件 bulk dataset を使った mutation 系 bulk 回帰
- design system 方針書初版の作成
- `UI_RULES` の design system 再編

## 5. 直近の確認結果

- `npm run check:full` 通過
- `npm run check` 通過
- `npx.cmd playwright test e2e/tests/cases-access.spec.ts` 通過
- `npx.cmd playwright test e2e/tests/cases-access.spec.ts e2e/tests/send-history-safety.spec.ts` 通過
- `npx.cmd playwright test e2e/tests/ems-offline.spec.ts` 通過
- `npx.cmd playwright test e2e/tests/ems-offline.spec.ts`
  - `server優先で破棄` の focused E2E を含めて通過
- `npx.cmd playwright test e2e/tests/ems-offline.spec.ts --grep "retry all|conflict restore notice"` 通過
- `npx.cmd playwright test e2e/tests/hospital-flows.spec.ts --grep "operational notifications|consult comment emits EMS notification"` は追加・実行済み
  - 初回実行で通知 dedupe race を検出し修正済み
  - 再実行はローカル Next.js / Playwright 環境の不安定化で完走未確認
- `npx.cmd playwright test e2e/tests/cases-access.spec.ts e2e/tests/hospital-flows.spec.ts --grep "send-history accepts caseRef|EMS only sees own team cases|ADMIN sees all cases|cannot read or update another team's case target|cannot update another hospital's target"` は scope 確認で実行
  - `cases-access` の追加 2 件は assertion 修正後に個別再実行で通過
  - `hospital-flows` の既存 assertions には今回対象外の不一致が残るため、認可 workstream の完了判定には含めない
- Phase 2 設計メモを追加し、実装単位を `A. Search score -> B. Alert -> C. Metrics` に整理済み
- `npm run check` 通過
- `npx.cmd playwright test e2e/tests/hospital-search-score.spec.ts` 通過
- `npx.cmd playwright test e2e/tests/operational-alerts.spec.ts` 通過
  - EMS `selection_stalled` 通過
  - EMS `consult_stalled` 通過
  - HOSPITAL 通知 / ADMIN alert 通過
  - ADMIN alert は既存実データ混在を考慮し、件数固定ではなく stalled alert 文言存在で検証
- `npx.cmd playwright test e2e/tests/hospital-flows.spec.ts e2e/tests/operational-alerts.spec.ts` 通過
  - HOSPITAL 通知 dedupe / ack 通過
  - EMS / HOSPITAL consult stalled 通過
  - UI 再構築後の locator を更新済み
- `dashboardAnalytics.ts` の KPI を Phase 2 定義へ整理済み
- `search score snapshot` は送信履歴 payload と DB 保存先を同時設計すべきと判断し、Phase 2 では見送り
- `npx.cmd playwright test e2e/tests/role-shells.spec.ts` 通過
  - EMS / HOSPITAL settings と DISPATCH shell header の focused E2E を追加して確認
  - loading.tsx は build 対象として `npm run check:full` で確認し、追加の focused E2E は不要と判断
- `node scripts/manage_case_load_test_data.js reset` / `seed --count 100` / `verify --expected 100` 実施
  - 事案、送信履歴、状態、相談メッセージ、患者、事案関連通知のみを対象に初期化
  - 10シナリオ x 10件で計100件の詳細データを投入
  - `selection_stalled`、`consult_stalled`、`TRANSPORT_DECIDED`、`TRANSPORT_DECLINED`、`NOT_ACCEPTABLE`、dispatch 起票混在を含めて分布確認済み
- `npx.cmd playwright test e2e/tests/bulk-case-views.spec.ts` 通過
  - Playwright 開始後に bulk dataset を再投入し、ADMIN / EMS / HOSPITAL / DISPATCH の 4 role で UI/E2E を確認
  - EMS は自隊 scope と送信履歴展開、HOSPITAL は要相談モーダル、DISPATCH は dispatch 起票由来一覧、ADMIN は詳細 workbench を確認
- `npx.cmd playwright test e2e/tests/bulk-case-mutations.spec.ts` 通過
  - HOSPITAL: `READ -> NEGOTIATING`、`NEGOTIATING -> ACCEPTABLE`、`NEGOTIATING -> NOT_ACCEPTABLE`
  - EMS: `ACCEPTABLE -> TRANSPORT_DECIDED`、`NEGOTIATING -> TRANSPORT_DECLINED`
  - ADMIN: mutation 後の一覧反映と履歴追従を確認
  - DISPATCH: dispatch 起票混在データの一覧可視性と EMS scope 反映を確認
- mutation 系 bulk 回帰の完了後、`node scripts/manage_case_load_test_data.js reset` -> `seed --count 100` -> `verify --expected 100` で baseline 100件 dataset に戻し済み
- `offline diff/automerge` の保留条件を再確認
  - `offlineSync.ts` の競合検知は引き続き `baseServerUpdatedAt` 比較のみ
  - `server payload snapshot` 不在のため、差分比較 UI / 自動マージは deferred 継続が妥当
- [2026-04-05-design-system-policy-design.md](/C:/practice/medical-support-apps/docs/plans/2026-04-05-design-system-policy-design.md) を追加
  - Atlassian Design System の思想をこの業務 UI へ移植する方針書初版
  - `Foundations / Components / Patterns / Tools` の整理、token 導入方針、Phase 1-3 の移行計画を定義
- [UI_RULES.md](/C:/practice/medical-support-apps/docs/UI_RULES.md) を再編
  - `Foundations / Components / Patterns / Tools` 構成へ整理
  - 白ベース、高密度、role 整合、状態意味統一、overlay / table / dialog の使い分けを design system ルールとして明文化
- `globals.css`、`RequestStatusBadge`、`ConfirmDialog`、`SettingActionButton`、shared loading 系へ design system Phase 1 の最小導入を実施
  - `ds token`、button tone、status badge tone、dialog / loading surface を共通化
  - `npm run check` 通過
- `PortalShellFrame`、`AdminWorkbench`、`AdminCasesPage`、`CaseSelectionHistoryTable`、`ManualRefreshButton` へ design system token / surface / field / table を反映
  - `ds-panel-surface`、`ds-muted-panel`、`ds-field`、`ds-table-*` を導入
  - `npm run check` 通過
- `AdminDevicesPage`、`AdminEntityEditor`、`AdminEntityCreateForm`、`HospitalFacilitySettingsForm`、`HospitalOperationsSettingsForm`、`DecisionReasonDialog`、`ConsultChatModal`、`NotificationBell` へ design system を横展開
  - form / audit panel / dialog / notification の one-off class を token ベースへ寄せた
  - `npm run check` 通過
- `HospitalNotificationSettingsForm`、`HospitalDisplaySettingsForm`、`EmsInputSettingsForm`、`EmsNotificationsSettingsForm`、`EmsDisplaySettingsForm`、`EmsSyncSettingsForm`、`SettingReadOnlyBadge` へ design system を横展開
  - settings toggle row、summary panel、display slider card、read-only badge を token ベースへ寄せた
  - `npm run check` 通過
- `AdminUsersPage`、`AdminOrgsPage`、`AdminLogsPage`、`HospitalRequestDetail` へ design system を横展開
  - editor / audit / filter / detail metadata / consult summary / action overlay を `ds-panel-surface`、`ds-muted-panel`、`ds-field`、`ds-dialog-surface`、button primitive ベースへ寄せた
  - `npm run check` 通過
- `HospitalConsultCasesTable`、`HospitalRequestsTable` へ design system を横展開
  - dense table surface、detail dialog、consult confirm panel、送信完了 / 電話連絡 modal を `ds-table-surface`、`ds-dialog-surface`、`ds-muted-panel`、button primitive ベースへ寄せた
  - `npm run check` 通過
- `PatientSummaryPanel`、`DetailPageSkeleton`、`ListPageSkeleton`、`SettingsPageSkeleton` へ design system を横展開
  - shared summary surface、muted card、loading panel / table skeleton を `ds-panel-surface`、`ds-muted-panel`、`ds-table-surface` ベースへ寄せた
  - `npm run check` 通過
- `OfflineQueuePage`、`HospitalMedicalInfoPage`、`MedicalInfoGridSkeleton` へ design system を横展開
  - offline queue detail panel / action button / status chip、medical info summary panel / skeleton を `ds-panel-surface`、`ds-muted-panel`、button primitive、status badge tone ベースへ寄せた
  - `npm run check` 通過
- `HospitalPatientsTable`、`HospitalHomeKpiSection`、`TransferRequestConfirmPage`、`TransferRequestCompletedPage` へ design system を横展開
  - patient detail / department modal、KPI card、transfer request confirm / completed panel と CTA を `ds-panel-surface`、`ds-table-surface`、`ds-muted-panel`、`ds-dialog-surface`、button primitive ベースへ寄せた
  - `npm run check` 通過
- `HospitalSearchPage`、`SearchConditionsTab`、`HospitalRequestDetail` の残り one-off class を整理
  - search context panel、履歴 table、検索条件 panel / input / CTA、request detail action button を `ds-panel-surface`、`ds-table-surface`、`ds-muted-panel`、`ds-field`、button primitive ベースへ寄せた
  - `npm run check` 通過
- `SearchResultsTab`、`DispatchCaseCreateForm`、`EmsSyncSettingsForm`、`CaseFormPage`、`AdminCasesPage`、`Sidebar` / `DispatchSidebar` の残り one-off class を整理
  - search result panel、dispatch create form、offline queue link、case form modal、sidebar / icon action を `ds-panel-surface`、`ds-table-surface`、`ds-dialog-surface`、`ds-field`、button primitive ベースへ寄せた
  - `npm run check` 通過
- design system Phase 1 の残件検索を実施
  - `components/` 配下の主要 panel / table / dialog / field / action の代表 one-off class は整理済み
  - `npm run check` 通過

## 6. 再開時にまず見るファイル

- 認可 helper: [caseAccess.ts](/C:/practice/medical-support-apps/lib/caseAccess.ts)
- role helper: [routeAccess.ts](/C:/practice/medical-support-apps/lib/routeAccess.ts)
- Phase 2 alert helper: [operationalAlerts.ts](/C:/practice/medical-support-apps/lib/operationalAlerts.ts)
- Phase 2 metrics: [dashboardAnalytics.ts](/C:/practice/medical-support-apps/lib/dashboardAnalytics.ts)
- 搬送判断: [sendHistoryStatusRepository.ts](/C:/practice/medical-support-apps/lib/sendHistoryStatusRepository.ts)
- 監査ログ: [auditLog.ts](/C:/practice/medical-support-apps/lib/auditLog.ts)
- 通知仕様の土台: [route.ts](/C:/practice/medical-support-apps/app/api/notifications/route.ts)
- hospital request schema: [hospitalRequestSchema.ts](/C:/practice/medical-support-apps/lib/hospitalRequestSchema.ts)
- オフライン同期: [offlineSync.ts](/C:/practice/medical-support-apps/lib/offline/offlineSync.ts)
- UI foundation: [globals.css](/C:/practice/medical-support-apps/app/globals.css)
- status 表示: [RequestStatusBadge.tsx](/C:/practice/medical-support-apps/components/shared/RequestStatusBadge.tsx)
- 共通 shell: [PortalShellFrame.tsx](/C:/practice/medical-support-apps/components/shared/PortalShellFrame.tsx)
- admin workbench: [AdminWorkbench.tsx](/C:/practice/medical-support-apps/components/admin/AdminWorkbench.tsx)
- setup SQL: [setup_hospital_requests.sql](/C:/practice/medical-support-apps/scripts/setup_hospital_requests.sql)
- E2E setup: [global-setup.ts](/C:/practice/medical-support-apps/e2e/global-setup.ts)

## 7. 運用メモ

- 重大な削除破壊的操作以外は事前承認済みの運用
- 日本語テキストと改行を壊さないことを優先する
- `hospital_patients(case_uid)` の unique 制約は、重複掃除後に張る前提
- 次回は本書の `3. 次回実施すること` から再開する
- オフライン競合は `手動解決`、`server優先`、`事案フォーム再保存` を前提とする
- 100件 bulk dataset の現在値は `scripts/manage_case_load_test_data.js` を正本にする
- bulk dataset は事案関連だけを対象に初期化する
  - `users`、`emergency_teams`、`hospitals`、`medical_departments`、settings、監査ログは削除しない
- bulk UI/E2E の前提確認は [bulk-case-views.spec.ts](/C:/practice/medical-support-apps/e2e/tests/bulk-case-views.spec.ts) を使う
- design system 導入は「全面作り直し」ではなく「Foundations と primitive を先に揃える」順で進める
- role 別 shell 差は残してよいが、状態色、field、button、dialog、table の意味は共通化する
- Phase 1 の最小導入済み対象は `globals.css`、`RequestStatusBadge`、`ConfirmDialog`、`SettingActionButton`、shared loading 系
- shell / workbench / field / table の共通 class は `globals.css` を正本にし、one-off class の追加より先にそこを確認する
- shared modal / notification は `ds-dialog-surface` と button primitive を優先し、個別 shadow / border / button tone の追加を避ける
- settings form は `ds-panel-surface` / `ds-muted-panel` / `ds-field` を優先し、role 色は badge や accent に限定する
- design system Phase 1 の完了条件として、`components/` 配下の主要 panel / table / dialog / field / action の代表 one-off class は整理済み
