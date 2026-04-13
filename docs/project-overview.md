# プロジェクト全体概要

最終更新: 2026-04-12

この文書は、`medical-support-apps` の現在地を 1 ファイルで把握するための全体概要です。詳細な正本は、統合仕様は [system-spec-2026-03-29.md](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md)、現在の再開点は [current-work.md](/C:/practice/medical-support-apps/docs/current-work.md)、UI ルールは [UI_RULES.md](/C:/practice/medical-support-apps/docs/UI_RULES.md) を参照します。

## 1. プロダクト概要

このプロジェクトは、EMS、HOSPITAL、ADMIN、DISPATCH が同じ事案情報を扱う救急搬送支援システムです。

主な目的:

- EMS が現場から患者情報を入力し、候補病院を検索して受入要請を送る
- HOSPITAL が自院宛の受入要請を確認し、既読、要相談、受入可能、受入不可を返す
- EMS が病院応答と相談履歴を見て、搬送決定または搬送辞退を行う
- ADMIN が事案、組織、ユーザー、端末、監査ログ、監視状態を管理する
- DISPATCH が指令起票と指令由来事案の一覧確認を行う
- オフライン、通知、監査、認可、訓練モードを含め、現場運用で破綻しにくい状態管理を行う

## 2. 技術スタック

- Next.js 16 App Router
- React 19
- TypeScript 5
- ESLint 9
- Playwright E2E
- PostgreSQL via `pg`
- next-auth v5 Credentials
- WebAuthn MFA via `@simplewebauthn/server` / `@simplewebauthn/browser`
- npm

標準コマンド:

```powershell
npm run lint
npm run typecheck
npm run check
npm run check:full
npm run test:e2e
npm run security:audit
npm run performance:check
npm run backup:report
```

## 3. ディレクトリ構成

- `app/`: App Router の route、layout、loading、API route
- `components/`: role / domain 別 UI と shared pattern
- `lib/`: repository、schema、auth、認可、通知、analytics、offline、monitoring、domain logic
- `scripts/`: DB setup、seed、load test、backup report、performance check
- `e2e/`: Playwright E2E
- `docs/`: 仕様、計画、運用、方針、workstream、参照資料
- `skills/`: この repo 用の Codex skill
- `.github/workflows/`: CI

## 4. 主要ロール

### EMS

現場入力と搬送先決定を担当します。

- 事案作成 / 編集
- 患者基本情報、バイタル、所見、主訴、特記事項の入力
- 患者サマリー確認
- 病院検索
- 複数病院への受入要請送信
- 送信履歴確認
- 要相談チャット
- 搬送決定 / 搬送辞退
- 事案一覧 / 検索
- EMS 統計
- EMS 設定
- オフラインキュー確認

### HOSPITAL

自院宛の受入要請と搬送患者を扱います。

- 受入要請一覧
- 要相談一覧
- 既読、要相談、受入可能、受入不可
- 受入不可理由入力
- 患者サマリー確認
- 選定履歴確認
- 相談コメント送受信
- 搬送患者一覧
- 辞退案件確認
- 診療情報管理
- HOSPITAL 統計
- HOSPITAL 設定
- 自院 PC の端末登録状態確認

### ADMIN

個別事案へ直接介入せず、監視、管理、分析、運用保全を担当します。

- 管理ホーム
- ADMIN 統計
- 全事案一覧
- ユーザー管理
- 端末管理
- 組織管理
- 病院管理
- 救急隊管理
- 監査ログ
- 監視 / バックアップ状態確認
- training data 一括リセット
- 認証 / 端末運用資料の確認

### DISPATCH

指令起点の事案作成と一覧確認を担当します。

- 指令起票
- 指令一覧
- dispatch 起票案件の EMS 側反映
- DISPATCH shell / header / training banner

## 5. 業務フロー

### 5-1. 指令起票

DISPATCH または ADMIN が指令起点の事案を作成できます。作成された事案は EMS 側の scope と mode に従って表示されます。

### 5-2. EMS 事案作成

EMS は患者情報、現場情報、バイタル、所見、要請内容を入力します。入力内容は患者サマリーへ集約され、病院検索と受入要請送信の前提になります。

### 5-3. 病院検索

EMS は病院名、地域、診療科、距離、診療情報などをもとに候補病院を検索します。検索結果には score と理由が表示され、複数病院へ受入要請を送信できます。

### 5-4. HOSPITAL 応答

HOSPITAL は自院宛の target に対して、既読、要相談、受入可能、受入不可を返します。受入不可時は理由入力と EMS への電話連絡導線が含まれます。

### 5-5. 相談コメント

EMS と HOSPITAL は要相談 target 上でコメントをやり取りします。コメントは通知対象になり、consult stalled の監視にも利用されます。

### 5-6. 搬送判断

EMS は ACCEPTABLE になった target から搬送決定できます。搬送決定後は `TRANSPORT_DECIDED` が終端状態になり、二重決定や終端状態からの再遷移は拒否されます。

## 6. ステータスモデル

病院要請 target の代表状態:

- `UNREAD`: 未読
- `READ`: 既読
- `NEGOTIATING`: 要相談
- `ACCEPTABLE`: 受入可能
- `NOT_ACCEPTABLE`: 受入不可
- `TRANSPORT_DECIDED`: 搬送決定
- `TRANSPORT_DECLINED`: 搬送辞退

重要ルール:

- HOSPITAL は自院 target のみ更新可能
- EMS は自隊事案のみ更新可能
- ADMIN は管理 / 監視が中心で、事案状態の現場操作は行わない
- `TRANSPORT_DECIDED` は終端状態
- 二重搬送決定は repository / DB transaction で防止する
- 終端状態からの再遷移は拒否する

## 7. 認証 / 認可 / 端末登録

現在の認証基盤:

- ID / password による next-auth Credentials login
- JWT session
- session maxAge は 5 時間
- `users.session_version` による session invalidation
- inactive user の拒否
- login lockout
- 一時パスワード発行
- 初回 / 一時パスワード後の強制変更
- HOSPITAL の WebAuthn MFA 必須化。EMS は現行方針では MFA 対象外
- EMS / HOSPITAL の端末登録

端末登録:

- `devices.registered_device_key_hash`
- `devices.registered_user_id`
- 登録コード発行
- `/register-device`
- `/api/security/device-status`
- `/api/security/device-register`
- ADMIN devices 画面から登録コード発行
- HOSPITAL settings device 画面で登録状態確認

残る強化候補:

- 端末 fingerprint / 登録情報は初期強化済み。新規登録では device key hash を保存し、UI / API / audit は fingerprint 表示に寄せる
- raw `deviceKey` の扱いを hash / metadata 中心へ寄せる
- lost device / replacement flow の UI と監査を強化する
- ADMIN / DISPATCH は現行方針では MFA 対象外

## 8. 認可境界

共通 helper:

- `lib/routeAccess.ts`
- `lib/caseAccess.ts`

主な境界:

- EMS: 自隊事案、自隊送信履歴、EMS 設定
- HOSPITAL: 自院 target、自院患者、自院設定
- ADMIN: 管理ページ、管理 API、監査 / 監視
- DISPATCH: 指令作成 / 指令一覧

重点確認対象:

- page 表示可否と API 実行可否を分けて確認する
- UI の非表示だけを認可としない
- 更新系 API は server 側で role / ownership を必ず検証する
- `case_id` と `case_uid` の混在に注意する

## 9. 通知 / operational alert

通知基盤:

- EMS / HOSPITAL 通知
- dedupe
- ack
- target status change
- consult comment
- transport decided / declined
- selection stalled
- consult stalled
- request repeat
- reply delay

監視 / alert:

- `system_monitor_events`
- `security_signal`
- API failure
- notification failure
- rate limit hit
- login failure
- MFA failure
- device registration failure
- forbidden access
- bulk-send signal
- bulk status-update signal

## 10. オフライン

EMS を主対象にした offline foundation が実装されています。

実装済み:

- IndexedDB `medical-support-apps-offline`
- `caseDrafts`
- `offlineQueue`
- `hospitalCache`
- `searchState`
- `emsSettings`
- `syncMeta`
- offline queue
- resend
- retry all
- discard
- failure reason 分類
- conflict restore notice
- server 優先破棄
- 起動時 TTL purge
- logout 時の local protected data 削除
- session invalidated / device untrusted 検知時の削除 helper
- Web Crypto AES-GCM による `caseDrafts` / `offlineQueue` / `hospitalCache` 暗号化
- `/api/security/offline-key`

現在の制限:

- `hospitalCache` は 1日 TTL、logout 削除、AES-GCM 暗号化で保護
- conflict 自動マージは未実装
- 初期 conflict handling は snapshot、classification、diff UI、手動解決が前提
- request 状態や搬送決定系は初期段階では server 優先

## 11. Training / Demo Mode

training mode foundation は主要導線まで実装済みです。

仕様:

- `users.current_mode = LIVE | TRAINING`
- `cases.mode`
- `hospital_requests.mode`
- `hospital_patients.mode`
- `notifications.mode`
- LIVE mode は LIVE only
- TRAINING mode は TRAINING only
- TRAINING user のみ TRAINING 事案を作成可能
- DISPATCH / ADMIN / EMS が training 事案を作成可能
- training 通知は TRAINING mode かつ対象 scope のみ
- training data は本番 analytics から除外
- training 一括リセットは ADMIN のみ
- UI は banner / badge / 保存先説明で mode を明示

実装済み:

- user mode settings API
- EMS / HOSPITAL / ADMIN settings の mode 切替
- settings shell の training banner
- case / request / patient / notification の mode foundation
- case access、search、hospital request、dispatch list の mode filter
- consult comment / send-history / status update の mode 伝播
- EMS / HOSPITAL / ADMIN home と stats の training analytics 非表示
- EMS / DISPATCH create UI の mode badge
- focused E2E

残る作業:

- role page / notification edge case の微修正が入った場合の追加確認
- major feature はほぼ閉じており、今後は regression 中心

## 12. Analytics / KPI

実装済み:

- EMS dashboard analytics
- HOSPITAL dashboard analytics
- ADMIN dashboard analytics
- stats pages
- range filter
- incident / region / age / team / hospital 分布
- stalled alert
- priority watch
- backlog watch
- search score

方針:

- KPI card だけで終わらせず、pending / alert / backlog / drill-down と組み合わせる
- ADMIN は問題カテゴリ、病院別、地域別の drill-down を優先する
- HOSPITAL は自院宛案件の priority sort と次アクションを優先する

## 13. UI / Design System

UI の正本は [UI_RULES.md](/C:/practice/medical-support-apps/docs/UI_RULES.md) です。

基本方針:

- 白ベース
- 高密度
- `first look -> compare -> act`
- 8px-based spacing
- 色は role ではなく意味で使う
- EMS は iPad 横固定前提
- HOSPITAL / ADMIN / DISPATCH は PC 前提
- 横スクロールは原則避ける
- loading / empty / error / read-only / conflict を通常状態と同等に扱う

導入済み foundation / primitive:

- `ds-*` token
- panel surface
- muted panel
- table surface
- dialog surface
- button primitive
- field style
- status badge
- loading skeleton

導入済み shared pattern:

- `SplitWorkbenchLayout`
- `DetailDialogFrame`
- `DetailMetadataGrid`
- `TablePagination`
- `KpiPanel`
- `KpiBacklogSection`
- `SectionPanelFrame`
- `MetricPanelFrame`
- `DashboardHeroShell`
- `ActionLinkPanel`
- `PriorityListPanel`
- `SelectableRowCard`
- `AuditTrailList`
- `ActionFooter`

今後の UI 追加ルール:

- 新規画面は既存 shared pattern を先に確認する
- one-off class だけで新規画面を組まない
- 例外は plan または `current-work.md` に理由を残す
- 日本語 UI 文言と UTF-8 を壊さない

## 14. 管理 / 運用基盤

実装済み:

- `/api/health`
- fail-safe status
- role 別 fail-safe policy
- `/admin/monitoring`
- `system_monitor_events`
- `backup_run_reports`
- `/api/admin/monitoring/backup-runs`
- `BACKUP_REPORT_TOKEN`
- `scripts/report_backup_run.mjs`
- `npm run backup:report`
- backup / restore runbook
- monitoring / alerting runbook
- fail-safe runbook
- incident response runbook
- secret rotation runbook
- auth / device operations guide
- lost device runbook
- data retention policy
- security logging policy
- infrastructure overview
- environment separation policy
- vulnerability response runbook

残る運用連携:

- backup job 本体との自動連携
- 外部監視 SaaS / 通知経路の製品選定
- DB dump / restore automation の環境別実装
- DB at-rest encryption の本番基盤要件反映

## 15. セキュリティ / インフラ hardening

実装済み:

- security headers
- login lockout
- rate limit helper
- login / search / notifications / 重要更新 API への rate limit
- session version invalidation
- temporary password
- forced password change
- WebAuthn MFA for EMS / HOSPITAL
- device registration
- security signal taxonomy
- unauthorized access audit
- security monitoring
- `npm run security:audit`
- CI security audit step
- Dependabot weekly npm PR
- vulnerability response runbook
- performance check script
- 1000件 load dataset seed 対応
- 主要一覧 / 検索 / 監視向け index

残る主な強化候補:

- 既存 registered device key 平文 row の hash 移行と失効 UI 強化
- backup run report の job 連携
- `hospitalCache` 暗号化は 2026-04-12 に対応済み。今後は大規模キャッシュ時の検索速度を観察する
- DB at-rest encryption の本番要件固定
- external alerting の接続
- 10000件以上の性能確認

## 16. データモデル概要

代表テーブル:

- `users`
- `emergency_teams`
- `hospitals`
- `medical_departments`
- `devices`
- `cases`
- `hospital_requests`
- `hospital_request_targets`
- `hospital_request_events`
- `hospital_patients`
- `notifications`
- `audit_logs`
- `login_attempts`
- `user_mfa_credentials`
- `system_monitor_events`
- `backup_run_reports`

重要な設計:

- 事案識別は `case_uid` と `case_id` の役割を分ける
- role / ownership scope は repository / API 側で検証する
- hospital request は request / target / event に分離する
- notifications は mode と audience scope を持つ
- training data は LIVE analytics に混入させない
- audit / monitoring は運用判断に使える粒度で残す

## 17. テスト / 検証

代表 E2E:

- `e2e/tests/cases-access.spec.ts`
- `e2e/tests/send-history-safety.spec.ts`
- `e2e/tests/hospital-flows.spec.ts`
- `e2e/tests/operational-alerts.spec.ts`
- `e2e/tests/ems-offline.spec.ts`
- `e2e/tests/training-mode.spec.ts`
- `e2e/tests/admin-hospital-intervention.spec.ts`
- `e2e/tests/security-hardening.spec.ts`
- `e2e/tests/security-ops-monitoring.spec.ts`
- `e2e/tests/device-registration.spec.ts`
- `e2e/tests/bulk-case-views.spec.ts`
- `e2e/tests/bulk-case-mutations.spec.ts`
- `e2e/tests/load-10000-readonly.spec.ts`
- `e2e/tests/role-shells.spec.ts`

検証方針:

- UI / TS 変更は `npm run check`
- routing / build impact は `npm run check:full`
- workflow 変更は focused E2E
- major workflow 変更後は `npm run test:e2e`
- performance / index 変更は `npm run performance:check`
- dependency / security 変更は `npm run security:audit`

## 18. 現在の優先順位

`current-work.md` 上の現在優先順:

1. security / operations hardening
2. training / demo mode foundation の回帰と微修正
3. Admin / HOSPITAL 導線強化の微調整
4. offline conflict handling 強化の微調整

ただし、ADMIN / DISPATCH は現行方針では通常ログイン MFA 対象外です。

直近で進めるべき候補:

1. `admin` route guard の再点検と修正
2. 既存 registered device key 平文 row の hash 移行と失効 UI 強化
3. backup run report の job 連携
4. offline 暗号化の fail-closed 化
5. Offline Queue と HOSPITAL wide table のレイアウト改善
6. Admin Monitoring の対応優先 worklist 化

## 19. 既知の注意点

- 日本語 UI 文言と docs は UTF-8 を維持する
- PowerShell 出力だけで日本語文字化けを判断しない
- docs や TSX の全体再生成は避け、必要な範囲だけ編集する
- `tmp/` は作業生成物が残ることがあるため、削除前に中身を確認する
- localhost 起動は user-owned。browser 確認が必要な場合、起動済み app に対して `agent-browser` を使う
- destructive operation、実データ削除、production secret 変更、large migration は事前確認する

## 20. 参照順

初めてこの repo を読む場合:

1. [project-overview.md](/C:/practice/medical-support-apps/docs/project-overview.md)
2. [current-work.md](/C:/practice/medical-support-apps/docs/current-work.md)
3. [project-feature-inventory.md](/C:/practice/medical-support-apps/docs/project-feature-inventory.md)
4. [project-status-summary.md](/C:/practice/medical-support-apps/docs/project-status-summary.md)
5. [system-spec-2026-03-29.md](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md)
6. [UI_RULES.md](/C:/practice/medical-support-apps/docs/UI_RULES.md)
7. [workstreams/README.md](/C:/practice/medical-support-apps/docs/workstreams/README.md)
8. [operations/README.md](/C:/practice/medical-support-apps/docs/operations/README.md)
9. [policies/README.md](/C:/practice/medical-support-apps/docs/policies/README.md)
