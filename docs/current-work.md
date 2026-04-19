# 現在作業中の統合実装計画

最終更新: 2026-04-19

この文書を、現在進行中の実装を再開するための正本とする。
次回はまずこの文書を開き、ここに書かれた最優先タスク、次アクション、参照先から着手する。
日付付き plan は履歴と詳細判断、`docs/workstreams/` はテーマ別整理として扱い、本書を唯一の再開ハブにする。

## 0. 作業開始テンプレート

次回この作業を開始するときは、まずこの文書を開いたうえで次の文言を使う。

開始文言:

`docs/current-work.md の 3. 次回実施すること から再開してください。現在の主テーマは ガイドライン準拠ギャップ解消、security / operations hardening、training/demo mode、Admin/HOSPITAL 導線強化、offline conflict handling 強化です。既存 design system と UI_RULES を必ず前提にし、まずは 3-2 の順で確認してから実装に入ってください。`

最初の確認コマンド:

```powershell
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\current-work.md"
```

必要に応じた初手コマンド:

```powershell
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\UI_RULES.md"
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\system-spec-2026-03-29.md"
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\project-status-summary.md"
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\project-feature-inventory.md"
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\workstreams\authorization.md"
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\workstreams\notifications.md"
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\workstreams\offline.md"
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\medical-safety-guideline-gap-summary.md"
Get-Content -LiteralPath "C:\practice\medical-support-apps\docs\plans\README.md"
```

## 1. 参照元

- 全体進捗サマリ: [project-status-summary.md](/C:/practice/medical-support-apps/docs/project-status-summary.md)
- 機能一覧: [project-feature-inventory.md](/C:/practice/medical-support-apps/docs/project-feature-inventory.md)
- 統合仕様書: [system-spec-2026-03-29.md](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md)
- workstream 一覧: [README.md](/C:/practice/medical-support-apps/docs/workstreams/README.md)
- 認可: [authorization.md](/C:/practice/medical-support-apps/docs/workstreams/authorization.md)
- 通知: [notifications.md](/C:/practice/medical-support-apps/docs/workstreams/notifications.md)
- オフライン: [offline.md](/C:/practice/medical-support-apps/docs/workstreams/offline.md)
- 現行 UI ルール: [UI_RULES.md](/C:/practice/medical-support-apps/docs/UI_RULES.md)
- ガイドライン準拠ギャップ: [medical-safety-guideline-gap-summary.md](/C:/practice/medical-support-apps/docs/medical-safety-guideline-gap-summary.md)
- plan 一覧: [README.md](/C:/practice/medical-support-apps/docs/plans/README.md)

## 2. 方針

- 単なる機能追加より先に、安全性、整合性、競合制御を固める
- 実装順は、レビューで示された優先順位を基準にする
- 完了済みの項目は「完了済み」へ移し、次回対象だけを上段に残す
- 1 回の作業で完了しない内容は、追加するものと整理するものに分けて明示する
- 本書と関連 workstream を、次回開始時に迷わない粒度まで更新してから作業を閉じる
- 2026-04-09 以降は、認証・セッション・運用保全の hardening を新しい最優先テーマとして扱う
- 2026-04-14 以降は、`docs/Guideline` 準拠の不足整理を security / operations hardening より上位の横断テーマとして扱う
- 2026-04-14 時点で、文書系の新規作成は一旦 stop とする
- 文書系を再開するときは、必ず対話形式で細部まで詰めてから起案する
- 文書系で判断確認を行うときは、毎回 `Guideline 的にはどうか` を先に示し、そのうえで推奨案を提示する

## 3. 次回実施すること

優先順位順です。上から着手します。

### 3-1. 追加するもの

1. ガイドライン準拠ギャップ解消
   - 新しい最優先テーマ
   - `docs/Guideline/*.md` 5文書と現行 docs を照合し、技術対策に加えて `責任分界 / リスク評価 / 規程 / 証跡 / 定期監査 / BCP / ネットワーク安全管理 / 委託管理 / 真正性 / 保存性` の不足を埋める
   - summary:
     - `docs/medical-safety-guideline-gap-summary.md`
     - `docs/medical-safety-responsibility-matrix.md`
     - `docs/medical-safety-risk-assessment-register.md`
     - `docs/medical-safety-evidence-matrix.md`
     - `docs/medical-safety-vendor-cloud-checklist.md`
   - plan:
     - `docs/plans/2026-04-14-medical-safety-guideline-gap-design.md`
     - `docs/plans/2026-04-14-medical-safety-guideline-gap-implementation.md`
   - docs foundation は初版追加済み
     - 責任分界表
     - リスクアセスメント台帳
     - 規程 / 証跡一覧
     - 委託 / クラウド確認 checklist
   - 運用 runbook も初版追加済み
     - `docs/operations/id-inventory-runbook.md`
     - `docs/operations/audit-review-runbook.md`
     - `docs/operations/bcp-restore-drill-runbook.md`
     - `docs/operations/asset-education-runbook.md`
     - `docs/reference/medical-safety-record-templates.md`
   - 次は docs を運用定着レベルへ具体化する
      - 実名責任者欄
      - 記録保管場所
      - 導入組織別の連絡網
      - ネットワーク安全管理文書
      - 対外説明文書
   - 2026-04-19 追記:
     - `docs/reference/medical-safety-responsibility-assignment-template.md` に `導入組織情報`、`記録保管場所`、`保管ルール` を追加した
     - `docs/medical-safety-responsibility-matrix.md` と `docs/medical-safety-evidence-matrix.md` から、実名版と証跡保管責任者のひも付けを参照できるようにした
     - `docs/operations/network-security-runbook.md` に `構成図 / 接続点 / FW・ACL / 無線 LAN / 外部接続 / 監視点 / 例外ルール` を追加した
     - `docs/policies/external-explanation-for-transport-coordination-system.md` に `外部保存 / 問い合わせ窓口 / 障害時案内 / 正式記録との違い` を追加した
     - 対外説明文書は `導入先別に派生追加できるひな形` として扱う方針へ整理した
     - `docs/policies/external-explanation-for-transport-coordination-system-ems.md` を追加し、病院向け / EMS向けの初版を揃えた
     - `docs/operations/vendor-registry.md` に `契約 / SLA / 証跡 / 保存リージョン / 定期見直し / 未決事項管理` を追加した
     - `仮データ例` と `docs/reference/medical-safety-required-inputs.md` を追加し、実データ差し替え前の仮置き先と必要入力情報一覧を整理した
     - repo 側の優先度 B 文書雛形は一通り揃ったので、次は導入組織ごとの実データ投入へ進む
   - scope decision memo:
     - `docs/plans/2026-04-14-medical-record-scope-decision.md`
   - 当面の前提:
     - 本システムは `搬送調整支援システム` を主体として扱う
     - `診療録等連携`、`電子カルテ連携` は後続フェーズで扱う
   - 後続 plan:
     - `docs/plans/2026-04-14-medical-record-integration-prep-design.md`
     - `docs/plans/2026-04-14-medical-record-integration-prep-implementation.md`
2. security / operations hardening
   - 2026-04-14 追記: このテーマ単独ではなく、上記 `ガイドライン準拠ギャップ解消` の一部として継続する
   - 継続テーマ
   - 現状は `ID / Password + next-auth Credentials + JWT session` が中心で、MFA、lockout、session 失効、password reset、backup / restore、monitoring が不足している
   - 要件確定済み
   - Step 1-4 のうち、MFA の追加要素を除く基盤実装を先行導入済み
   - MFA は `HOSPITAL` 必須、`EMS / ADMIN / DISPATCH` 対象外へ方針固定済み
   - 2026-04-13 ローカル検証用の一時措置として、`HOSPITAL` の通常ログイン MFA は停止中
   - 一時停止メモ:
     - `docs/plans/2026-04-13-hospital-mfa-testing-disable-design.md`
     - `docs/plans/2026-04-13-hospital-mfa-testing-disable-implementation.md`
   - 再開時は `lib/mfaPolicy.ts` に `HOSPITAL` を戻し、`user_mfa_credentials` を再作成するのではなく各病院アカウントで再登録する
   - plan:
     - `docs/plans/2026-04-09-security-ops-hardening-design.md`
     - `docs/plans/2026-04-09-security-ops-hardening-implementation.md`
3. 訓練 / デモモード
   - foundation 実装は完了済み
   - `currentMode` 切替、mode 分離、analytics 除外、ADMIN reset まで導入済み
   - 次回は edge case 回帰か、training analytics など後続テーマを別 plan で扱う
4. Admin / HOSPITAL 導線強化
   - 次の主テーマ
   - Admin は監視 / drill-down、HOSPITAL は自院宛案件への直接対応強化として進める
   - 2026-04-12 追加: HOSPITAL 受入要請 / 相談一覧は選定科目 priority を先に見て、救命 -> CCU / CCUネットワーク / CCUネ -> 脳卒中S / 脳S / 脳卒中A / 脳A の順で上位表示する
5. offline conflict handling 強化
   - 次の主テーマ
   - 初期段階では snapshot / conflict classification / diff UI までを対象にし、自動マージはまだ入れない
6. DB schema / query hardening
   - 2026-04-14 追加
   - 本番DBレビューにより、`通知 dedupe`、`schema適用方式`、`analytics fallback`、`履歴保持`、`query inventory` を優先論点として整理した
   - inventory:
     - `docs/reference/db-table-inventory-2026-04-14.md`
     - `docs/reference/db-query-inventory-2026-04-14.md`
   - plan:
     - `docs/plans/2026-04-14-db-hardening-design.md`
     - `docs/plans/2026-04-14-db-hardening-implementation.md`
   - 直近の方針:
     - core table 自体の即削除はしない
     - 先に migration 正本化、fallback 削除、冪等化、cascade 見直しを進める
   - 2026-04-14 第1バッチ実施済み:
     - `lib/hospitalRequestSchema.ts` に notifications dedupe cleanup / unique index を反映
     - `lib/casesSchema.ts` と `lib/hospitalRequestSchema.ts` の `42501` skip を fail fast 化
     - `lib/dashboardAnalytics.ts` の legacy fallback query を削除
     - `hospital_requests.first_sent_at` を追加し、`sent_at` は最終送信時刻、`first_sent_at` は初回送信時刻として扱うよう整理した
     - `app/api/cases/send-history/route.ts` で `same request_id + same hospital_id` の `sent` event / request_received 通知を初回だけに制限した
     - EMS / ADMIN analytics の `HP決定` 指標は `最終送信` 基準へ変更した
     - `notifications` の FK を `ON DELETE SET NULL` へ変更し、親削除で通知履歴が消えない方向へ寄せた
     - `hospital_request_targets` / `hospital_request_events` / `hospital_patients` の主要 FK を `ON DELETE RESTRICT` へ変更し、履歴ハブの hard delete を抑止する方向へ寄せた
     - `resolveCaseByAnyId` を `lib/caseAccess.ts` に集約し、`send-history` 側の重複 query を削減した
     - `npm run check` 通過
   - 2026-04-19 第2バッチ実施済み:
     - `scripts/setup_cases_schema.sql` と `scripts/setup_hospital_requests.sql` を runtime 要件に合わせ、`distance_km`、`reason_code / reason_text`、mode backfill、通知 index 群、`hospital_department_availability`、`emergency_teams.phone` を setup 側へ揃えた
     - `lib/casesSchema.ts` と `lib/hospitalRequestSchema.ts` は runtime DDL をやめ、required table / column / index / constraint を検証して不足時に明示失敗する verify-only へ切り替えた
     - `lib/schemaRequirements.ts` を追加し、schema requirement 検証を共通化した
     - `scripts/verify_schema_requirements.mjs` と `npm run db:verify` を追加し、bootstrap 後の DB 要件確認経路を追加した
     - `npm run check` 通過
     - `.env.local` の `DATABASE_URL` を使って `npm run db:bootstrap` -> `npm run db:verify` を実行し、現行開発 DB で schema requirement 満足を確認した
     - `schema_migrations`、`scripts/migration_manifest.js`、`scripts/db_migrate.js`、`scripts/db_migration_status.js` を追加し、`db:bootstrap` を migration 記録付き運用へ切り替えた
     - 現行開発 DB で `npm run db:migrate`、`npm run db:migration:status`、`npm run db:verify` を実行し、全 migration が `APPLIED / OK` で記録されることを確認した
     - `migration_20260419_0009_hospital_request_fk_hardening.sql` を追加し、`hospital_request_targets / hospital_request_events / hospital_patients` の主要 FK を `ON DELETE RESTRICT` へ移行した
     - `db:verify` は column / index / constraint だけでなく、主要 FK の delete action も検証するように拡張した
     - `node scripts/check_query_performance.mjs --explain` を現行開発 DB で実行し、主要 query は fail / warn なし、`notifications_unread_scope` は index scan を確認した
     - `lib/notifications.ts` の一覧 / 未読集計を targeted 通知と shared 通知の `UNION ALL` へ変更し、通知一覧系の `Seq Scan` を避けやすい query へ寄せた
     - `scripts/check_query_performance.mjs` に `notifications_list_for_ems_user` を追加し、現行開発 DB で bitmap index scan ベースの実行計画を確認した

### 3-2. 直近の次アクション

次に始める作業は、搬送調整支援システムとして必要なガイドライン対応の残件整理です。着手順は以下を基準にします。

1. 導入組織ごとの実名責任者欄と記録保管場所を、導入時に実データで埋める
2. 対外説明文書の説明日、説明先、承認者を導入記録へ残す
3. 委託先台帳に実事業者、SLA、保存リージョン、再委託、削除条件を投入する

DB hardening を進める場合は、以下の順で着手する。

1. 残りの `ON DELETE CASCADE` を棚卸しし、履歴喪失リスクがあるものを migration 正本へ寄せる
   - 2026-04-19 時点で残っている `CASCADE` は `hospital_settings`、`ems_user_settings`、`ems_sync_state`、`hospital_departments`、`hospital_department_availability`、`user_mfa_*` が中心で、現状は履歴ハブではなく従属設定 / マスタ紐付けとして許容寄り
2. 本番相当データで query performance を継続測定し、`search / admin list / notifications list` の index 再評価に入る
3. setup SQL 直編集ではなく migration 追加運用へ移し、差分適用単位を分割する

#### 2026-04-19 プロジェクトレビュー反映

- 技術面の直近優先度は、ガイドライン文書より下ではなく、`通知 read/update query の性能是正` と `migration 運用の固定化` を同列で扱う
- `lib/notifications.ts` の一覧 / 集計は改善済みで、`markNotificationsRead()` も scoped id CTE へ寄せた。現行開発 DB の `EXPLAIN` では対象抽出側が bitmap index scan へ寄っている
- `scripts/migration_manifest.js` は immutable snapshot (`scripts/migrations/*.sql`) を参照するよう修正済みで、現行開発 DB の `schema_migrations` も `db:migrate` 実行で snapshot 名義へ reconcile 済み
- 5週レビュー / 実装ループの追加反映:
  1. `migration_20260419_0010_search_trgm_indexes.sql` を追加し、`cases.case_id / patient_name / address / symptom`、`emergency_teams.team_name`、`hospitals.name` に trigram index を追加した
  2. `app/api/admin/cases/route.ts` は `filtered_cases` CTE を挟み、`mode / team / division / area / stalled case ids` を先に絞ってから `hospitalName / status / reply_delay` を後段評価する形へ寄せた
  3. `app/api/cases/search/route.ts` は `case_id / patient_name / address / symptom` の OR 検索を `UNION` ベースの `matched_cases` へ分解し、列ごとの index 利用をしやすくした
  4. `scripts/check_query_performance.mjs` に `cases_search_keyword` と `admin_cases_filtered_search` を追加し、現行開発 DB の `EXPLAIN` を継続確認できるようにした
  5. 実 DB 検証では `admin_cases_filtered_search` は約 168ms -> 約 0.8ms まで改善し、`cases_search_keyword` も trigram index を使う plan に寄った
- 追加の 4週レビュー / 実装ループ反映:
  1. `app/api/cases/send-history/route.ts` の POST は、`cases.case_payload` 更新と `hospital_requests / targets / events / notifications` 作成を同一 transaction にまとめ、送信成功なのに病院要請が保存されない不整合を防ぐ形へ修正した
  2. `lib/casesClient.ts` の搬送判断更新は legacy PATCH をやめ、`/api/cases/send-history/[id]/status` へ一本化した
  3. `app/admin/settings/support/page.tsx` を追加し、Admin 設定トップや監視画面から system / notification / master 系 runbook へ直接入れるようにした
  4. `app/api/admin/monitoring/backup-runs/route.ts` で、取り込み API 自体の失敗も `recordApiFailureEvent` へ残すようにした
  5. `lib/admin/adminSettingsRepository.ts` は master summary 集計前にテーブル存在確認を挟むようにし、`hospital_department_availability` などが未作成の開発 DB でも `/admin/settings/master` が 500 で落ちないようにした
  6. `lib/authContext.ts`、`lib/admin/adminMonitoringRepository.ts`、`lib/admin/adminSettingsRepository.ts` は read path の runtime DDL をやめ、存在確認ベースの fallback 読み取りへ寄せた。デプロイ先 DB が DDL 権限を持たない構成でも Admin 系 Server Component が落ちにくい形へ補修した
- 追加の横断残件つぶし反映:
  1. `migration_20260419_0011_short_keyword_prefix_indexes.sql` を追加し、短い keyword に対する `case_id / patient_name / symptom` prefix index を migration 正本へ追加した
  2. `app/api/cases/search/route.ts` は `2文字以下の日本語` だけ `patient_name / symptom` の contains に絞り、`短い英数` は prefix index を使う分岐へ変更した
  3. `scripts/check_query_performance.mjs` に `cases_search_short_keyword` と `cases_search_short_prefix_keyword` を追加し、短語検索の実行計画を継続確認できるようにした
  4. 実 DB で `cases_search_short_keyword` は約 23.6ms、`cases_search_short_prefix_keyword` は約 0.085ms を確認し、短語検索の論点は「未対策」ではなく「継続監視」へ移した
  5. `app/admin/settings/system/page.tsx`、`app/admin/settings/notifications/page.tsx`、`app/admin/settings/master/page.tsx` を追加し、Admin 設定トップの system / notify / master を専用ページ付き導線へ置き換えた
  6. `PATCH /api/cases/send-history` は deprecated header を返す compatibility endpoint に縮退し、新規 caller は `/api/cases/send-history/[id]/status` を正本にする形へ整理した
- 残る性能論点:
  1. `emergency_teams` / `hospitals` は件数がまだ小さいため seq scan のままでも問題は小さいが、件数増加時は再評価対象
- 残る横断論点:
  1. 送信履歴 PATCH の legacy endpoint は deprecated 済みだが、完全削除前に外部 caller の棚卸しが必要
  2. ガイドライン文書の実データ投入は、導入組織ごとの責任者実名、保管場所、委託先情報が揃わない限り repo 単独では完了できない
- 次回 DB hardening へ入るときの最初の着手候補:
  1. 以後の schema 変更は `setup_*.sql` 直編集ではなく、差分 migration ファイル追加のみで進める
  2. 通知 read/update の実データ件数がさらに増えた場合に、`menu_key / tab_key` 条件向け index が必要か再評価する

### 3-3. 文書作業の現状

- 文書作業は 2026-04-14 時点で一旦 stop
- 残件の一覧把握は `docs/medical-safety-guideline-gap-summary.md` と本書 `3-2` を参照する
- 既存のたたき台:
  - `docs/operations/network-security-runbook.md`
  - `docs/policies/external-explanation-for-transport-coordination-system.md`
  - `docs/operations/vendor-registry.md`
  - `docs/reference/medical-safety-responsibility-assignment-template.md`
- 2026-04-19 時点で、責任者実名欄と記録保管場所の `様式` は追加済み
- 2026-04-19 時点で、対外説明文書と委託先台帳の `様式` も追加済み
- 対外説明文書は導入先別に追加してよく、病院向け / EMS向けを最初のひな形として扱う
- 実名データの入力は導入組織依存のため repo では保持せず、導入時作業として扱う
- 事業者名、契約番号、SLA、保存リージョン、連絡先も repo では固定値を持たず、導入時の内部台帳で埋める
- 次回再開時の進め方:
  - 先に論点を分割する
  - `Guideline 的にはこう` を先に確認する
  - その後に推奨案と運用案を比較する
  - 合意した内容だけを文書へ反映する

#### 2026-04-13 UI hardening メモ

- 固定ヘッダー系は `compact hero` を標準にし、下部の独立スクロール領域を圧迫しない方針へ整理した
- 一覧の primary pattern は `1 item = 1 card` を基本に寄せた
- `dispatch/cases`、`hospitals/declined`、`settings/offline-queue`、病院検索導線、`CaseSelectionHistoryTable compact` は card style 化済み
- dispatch sidebar は EMS / ADMIN 系 shell と同じ vocabulary に寄せた
- 次に UI 本線へ戻る場合は、`Admin / HOSPITAL 導線強化` を優先する
- 最初の着手候補:
  - HOSPITAL 受入要請 / 相談一覧の上位表示ロジックを、選定科目 priority の見え方まで含めて UI へ反映する
  - ADMIN の monitoring / drill-down で、一覧 -> 詳細 -> 次アクションの視線順を再整理する
 - 2026-04-13 に初回反映済み:
   - HOSPITAL 受入要請 / 相談一覧の card header に `救命優先 / CCU優先 / 脳卒中優先` chip と `次に見ること` を追加した
   - ADMIN `/monitoring` に `CASE DRILL-DOWN` section を追加し、`選定停滞 / 要相談停滞 / 返信遅延` から `/admin/cases` の filtered workbench へ直接遷移できるようにした
   - HOSPITAL `requests` / `consults` の page header 下に summary strip を追加し、priority 件数と pending 件数を一覧に入る前に確認できるようにした
   - ADMIN `/cases` では drill-down 条件を chip 表示にし、一覧到達後の文脈を維持するようにした
   - HOSPITAL detail と ADMIN detail pane の上段にも summary block を追加し、詳細表示後の `今何を見るか` を先に出すようにした
   - ADMIN の problem vocabulary は shared 定義へ寄せ、`home / monitoring / cases` で同じ名称と説明を使うようにした
   - headless screenshot で `admin/monitoring`、`admin/cases`、`hospitals/requests`、`hospitals/consults` の表示確認を実施した
   - `consult view` と `admin history tab` にも summary block を追加し、比較判断の文法を揃えた
   - `admin/monitoring` の health signal は異常発生中のものが上に来る priority 順へ整理し、右カラムに `FOCUS NOW` を追加した
   - HOSPITAL `patients` / `declined` にも summary strip を追加し、request / consult と同じ page-level 判断文法へ寄せた
   - `HospitalPatientsTable` と `hospitals/declined` の各カードに `status / priority / next action` chip を追加し、受入後 / 辞退後の確認意図を一覧で拾いやすくした
   - `admin/cases` history tab の直上に `HISTORY FOCUS / WAITING REPLY / ACCEPTABLE` summary を追加し、履歴確認の first look を補強した
   - HOSPITAL `patients` の modal / detail page には `FOLLOW-UP CHECK` を追加し、受入後の継続確認を detail 上段で拾えるようにした
   - `admin/settings/*` と `hp/settings/*` の詳細ページ header は settings トップと同じ文法に揃える方針へ寄せ、共通 `SettingPageLayout` を settings 専用 hero として強化した
   - 2026-04-14 に `EMS / HOSPITAL / DISPATCH / ADMIN` の settings top を共通 `SettingsOverviewPage` に載せ替え、hero / category card / summary strip の文法を role 横断で揃えた
   - 2026-04-14 に focused UI 回帰を再実施し、`admin-hospital-intervention`、`hospital-flows`、`role-shells`、`training-mode` は通過した
   - UI 本線はここで一区切りとし、以後は新規 workflow 追加時の局所 UI と focused E2E 追記だけを扱う

#### 2026-04-12 コードレビュー結果

- 最優先: admin 配下の page / layout に server-side role guard が不足していた
  - `app/admin/layout.tsx` は `getAuthenticatedUser()` の結果が null / non-ADMIN でも shell を描画できる構造だった
  - `app/admin/page.tsx`、`app/admin/stats/page.tsx`、`app/admin/monitoring/page.tsx`、管理系 list page は管理データ取得前の ADMIN 判定が弱かった
  - 対応済み: `lib/admin/adminPageAccess.ts` の `requireAdminUser()` を追加し、admin page / layout 全体で管理データ取得前に ADMIN role を必須化した
- 高優先: `app/admin/settings/mode/page.tsx` が `Promise.all([getAuthenticatedUser(), getTrainingDataSummary()])` で、認可前に訓練データ集計を取得し得る順序だった
  - 対応済み: `requireAdminUser()` 後に `getTrainingDataSummary()` を呼ぶ順序へ修正した
- 回帰テスト: admin 直アクセスの拒否 / 許可の E2E が不足していた
  - 対応済み: `e2e/tests/admin-access.spec.ts` を追加し、未ログイン、EMS、ADMIN の `/admin/monitoring` 直アクセスを確認する
- UI / layout の残課題: E2E 実行中に EMS shell の `data-ems-scale` hydration mismatch が出ている
  - 対応済み: `useEmsDisplayProfile()` の初期 viewport を SSR と CSR 初回で `{ width: 0, height: 0 }` に揃え、mount 後に実 viewport へ更新する形へ修正した
  - 2026-04-14 の focused `role-shells` 再確認では blocker は出ていない
  - 次に拾う場合は、EMS shell の viewport / density 更新時に layout shift が過剰でないか、iPad / desktop 幅で確認する
- UI / layout のレビュー観点: admin / hospital / EMS の workbench 系画面は情報量が多いため、今後の改善は `first look -> compare -> act` の順で、KPI、優先リスト、操作導線の視線順を崩さないことを基準にする
- UI / layout のレビュー観点: 長い日本語ラベル、ゼロ件、異常値、重複データでカード / テーブル / shell が崩れないことを、Playwright または agent-browser で重点確認する

1. security / operations hardening の残件を整理する
   - plan:
     - `docs/plans/2026-04-09-security-ops-hardening-design.md`
     - `docs/plans/2026-04-09-security-ops-hardening-implementation.md`
   - ここまでの実装:
     - `users.session_version`、`must_change_password`、`temporary_password_expires_at`、`locked_until` の schema foundation を追加
     - `login_attempts` を追加し、login lockout の保存先を用意
     - 端末キー継続識別は `devices.registered_device_key_hash` / `devices.registered_user_id` に集約し、新規登録では端末キー平文を DB に残さない
     - `auth.config.ts` で 5 時間 session maxAge、session version 照合、inactive user / invalidated session の拒否を追加
     - `/api/security/login-status` を追加
     - 旧 PIN overlay / `/api/security/pin` / `pinUnlockedAt` は 2026-04-11 に現行導線から削除済み
     - E2E support login を WebAuthn MFA 初回登録に追従させた
     - `devices` テーブルを拡張し、登録コード発行、registered device key hash、registered user を保持するようにした
     - `/register-device`、`/api/security/device-status`、`/api/security/device-register` を追加し、未登録端末を EMS / HOSPITAL で登録できるようにした
     - ADMIN devices 画面から登録コードを発行できるようにした
     - 端末登録完了後は明示的に再ログインへ戻すようにした
     - `HOSPITAL` 側にも `/hp/settings/device` を追加し、病院 PC の登録状態と WebAuthn MFA 状態を確認できるようにした
     - `@simplewebauthn/server` / `@simplewebauthn/browser` を追加し、HOSPITAL のログアウト後ログインで WebAuthn MFA を必須化した。EMS は現行方針では MFA 対象外
     - ADMIN users 画面に login lock 解除と一時パスワード発行を追加した
     - `/change-password` と `/api/security/change-password` を追加し、一時パスワード後の強制変更導線を追加した
     - `security-hardening` focused E2E を追加し、unlock と temporary password の往復を検証できるようにした
     - `docs/operations/device-registration-guide.md` を追加し、端末登録運用を初心者向けに整理した
   - 次にやること:
     - `docs/plans/2026-04-11-security-infra-gap-plan.md` を起点に、セキュリティ / インフラ不足分の Phase 1 から着手する
     - セキュリティヘッダ、古い PIN / 8時間仕様の docs 修正、security event taxonomy、監視画面の不正操作兆候表示を優先する
     - Phase 1 は 2026-04-11 に実装済み
       - security headers 追加
       - `security_signal` 追加
       - MFA / 端末登録 / 権限逸脱の監視イベント化
       - `/admin/monitoring` の `不正操作兆候` 表示
       - `docs/policies/security-logging-policy.md` 追加
       - 古い PIN / 8時間仕様の主要 docs 更新
       - 旧 PIN API / PIN repository functions / `SecuritySessionGate` / `pinUnlockedAt` を削除
       - 旧 `user_security_devices` 依存を削除し、端末登録状態を `devices` に一本化
     - Phase 2 は 2026-04-11 に一部実装済み
       - IndexedDB store 別 TTL を追加
       - ログアウト時のローカル保護データ削除と起動時 TTL purge を追加
       - セッション失効 / 端末未信頼時に削除できる helper を追加
       - `/api/security/offline-key` と Web Crypto AES-GCM による `caseDrafts` / `offlineQueue` 暗号化を追加
       - `docs/policies/offline-data-protection-policy.md` を追加
       - `hospitalCache` は 2026-04-12 に暗号化対象へ追加済み。検索は `getAll` 後の復号済み配列で行うため、既存導線への影響は小さい
       - DB at-rest 暗号化を本番基盤要件へ反映済み。`infrastructure-overview`、`deployment-onboarding-guide`、`backup-restore-runbook` に production PostgreSQL / backup store 暗号化確認を追加した
       - DB 列単位暗号化は 2026-04-12 時点では実装しない判断を記録済み。`docs/plans/2026-04-12-db-column-encryption-decision.md` を参照
       - 端末 fingerprint / 登録情報は 2026-04-12 に強化済み。新規端末登録は `registered_device_key_hash` へ保存し、API / UI / audit には完全な device key ではなく fingerprint を出す
     - ADMIN / DISPATCH は現行方針では MFA 対象外として固定し、通常ログイン導線のみを維持する
     - Phase 3 は 2026-04-12 に一部実装済み
       - `/api/health` を追加
       - backup job 向け `BACKUP_REPORT_TOKEN` 認証と `npm run backup:report` を追加
       - backup command の終了結果を自動報告する `npm run backup:job` を追加
       - 本番構成図、環境分離、secret rotation、monitoring / alerting runbook を追加
     - Phase 4 先行分は 2026-04-12 に一部実装済み
       - ログイン失敗を `security_signal` に記録
       - ログイン失敗がロックしきい値へ到達した場合は `error` severity で監視化
       - 権限逸脱試行を `audit_logs` と `security_signal` の両方へ記録
     - Phase 4 脆弱性対応運用は 2026-04-12 に一部実装済み
       - `next@16.2.3` へ更新し、`npm audit --audit-level=high` の検出を 0 件にした
       - `npm run security:audit` と CI audit step を追加
       - `.github/dependabot.yml` と脆弱性対応 runbook を追加
     - Phase 4 不正操作検知は 2026-04-12 に一部実装済み
       - 受入要請の大量送信を `operations.bulk-send` の `security_signal` として検知
       - 受入要請ステータスの大量更新を `operations.status-update` の `security_signal` として検知
       - 同一 user / signalType は15分に1回だけ記録
     - Phase 4 フェイルセーフは 2026-04-12 に一部実装済み
       - `/api/health` に `failSafe.status` と role 別制限運転方針を追加
       - DB停止時は `degraded_db_unavailable` を返す
       - `docs/operations/fail-safe-runbook.md` を追加
     - Phase 4 性能 / index 初期実装は 2026-04-13 に一部実装済み
       - `manage_case_load_test_data.js` を10000件 seed 対応
       - 2026-04-12 に `reset` 後、LOAD dataset 1000件を再投入済み
       - 投入結果は `cases=1000`、`hospital_requests=900`、`hospital_request_targets=1900`、`hospital_request_events=2000`、`notifications=1500`、`hospital_patients=100`
       - seed 中に残存 DB transaction が `cases_case_id_key` をロックしたため、LOAD seed script に `lock_timeout` / `idle_in_transaction_session_timeout` / `statement_timeout` を追加済み
       - 長時間 seed が未コミット状態を抱えないよう、100件単位の chunk commit に変更済み
       - 2026-04-13 に row-by-row seed が 2800件時点でタイムアウトしたため、chunk 単位の bulk INSERT / bulk UPDATE へ変更済み
       - 2026-04-13 に `reset` -> `seed --count 10000 --chunk-size 100` -> `verify --expected 10000` を実施済み
       - 10000件投入結果は `cases=10000`、`hospital_requests=9000`、`hospital_request_targets=19000`、`hospital_request_events=20000`、`notifications=15000`、`hospital_patients=1000`
       - LOAD seed は E2E cleanup に巻き込まれないよう、`E2E-TEAM-A/B` と `990001/990002` 病院を参照対象から除外済み
       - LOAD seed は E2E user 再作成と衝突しないよう、操作ユーザー FK を持たせない方針へ変更済み
       - scripts 側の DB URL 読み込みを `scripts/db_url.js` に共通化し、`sslmode=require/prefer/verify-ca` は `verify-full` に正規化する
       - `npm run performance:check` を追加
       - `node scripts/check_query_performance.mjs --explain` で `admin_cases_latest` / `ems_cases_latest_by_team` / `case_send_history` は想定 index 利用を確認済み
       - 10000件で `node scripts/check_query_performance.mjs --explain` を実行し、全 query が warn / fail なしで通過
       - `hospital_requests_by_hospital` は Incremental Sort + Nested Loop、`notifications_unread_scope` は Seq Scan + top-N Sort が残るが、10000件ではそれぞれ約3.0ms / 2.7ms の実行で許容範囲
       - `e2e/tests/load-10000-readonly.spec.ts` を追加し、10000件を壊さず ADMIN / EMS / HOSPITAL / DISPATCH の大量一覧 / layout を確認
       - EMS の事案検索一覧は 10000件 dataset でも tablet 幅で固まらないよう、初期表示 limit を40件にした
       - `/api/notifications` で materialize する repeat / stalled 系通知は1回20件までに制限し、大量未読時の画面初期表示を安定化した
       - E2E global setup で `1方面/2方面/3方面` の division 制約を補正し、LOAD seed と E2E fixture の衝突を避けるよう case number を調整した
       - 主要一覧 / 検索 / 監視向け index を追加
       - `docs/operations/performance-index-runbook.md` を追加
     - 端末 fingerprint / 登録情報の持ち方は 2026-04-12 に初期強化済み。2026-04-13 に `registered_device_key` 平文移行スクリプト、hash のみ照合、ADMIN 端末登録解除 UI / API を追加済み。開発DBでは平文 row 0 件を確認済み
     - `ADMIN / DISPATCH` の通常ログイン MFA は着手対象から外し、将来 step-up MFA の余地だけを維持する
     - backup run report の自動連携は 2026-04-12 に `npm run backup:job` を追加済み。2026-04-13 に `npm run ops:verify` を追加し、production env / `/api/health` / backup report token の事前確認をできるようにした。実 production job では環境固有の backup command を `--` 以降に渡す
     - 10000件性能確認は 2026-04-13 に完了済み。次に性能を拾う場合は `notifications_unread_scope` の Seq Scan が実データ増加で悪化しないかを優先観察する
   - 今回追加:
     - `lib/rateLimit.ts` に route 共通 rate limit helper を追加した
     - login / search / notifications / 重要更新 API に推奨 policy を適用した
     - `lib/systemMonitor.ts` に `system_monitor_events` と `backup_run_reports` を追加した
     - `docs/operations/backup-restore-runbook.md` を追加した
     - `/admin/monitoring` を追加し、アプリ生存、DB 接続、ログイン失敗、API 失敗、通知失敗、バックアップ成否を表示できるようにした
     - `/api/admin/monitoring/backup-runs` を追加し、バックアップ結果の記録口を用意した
     - `security-ops-monitoring` focused E2E を追加した
     - 運用 / 説明資料として以下を追加した
       - `docs/operations/operations-account-lifecycle.md`
       - `docs/operations/lost-device-runbook.md`
       - `docs/operations/incident-response-runbook.md`
       - `docs/operations/support-contact-guide.md`
       - `docs/operations/training-demo-runbook.md`
       - `docs/operations/release-runbook.md`
       - `docs/operations/deployment-onboarding-guide.md`
       - `docs/operations/admin-operations-guide.md`
       - `docs/policies/data-retention-policy.md`
       - `docs/policies/data-handling-overview.md`
       - `docs/policies/security-overview.md`
       - `docs/policies/auth-authorization-policy.md`
       - `docs/policies/infrastructure-overview.md`
       - `docs/proposals/poc-overview.md`
     - admin 配下の page / layout に `requireAdminUser` を追加し、管理データ取得前に ADMIN role を必須化した
     - `settings/mode` は訓練データ集計より前に ADMIN 判定を行う順序へ修正した
     - `admin-access` focused E2E を追加し、未ログイン / EMS の admin 直アクセス拒否を確認対象にした
2. training / demo mode foundation は実装完了済み
   - plan:
     - `docs/plans/2026-04-06-training-mode-design.md`
     - `docs/plans/2026-04-06-training-mode-implementation.md`
   - ここまでの実装:
     - `users.current_mode` の foundation を追加
     - user mode settings API を追加
     - EMS / HOSPITAL / ADMIN settings に mode 切替画面を追加
     - settings shell に training banner を追加
     - `cases` / `hospital_requests` / `hospital_patients` / `notifications` の `mode` foundation を追加
     - case access、case search、hospital request list/detail、dispatch case list に mode filter を追加
     - consult comment / send-history / status update の通知と patient 書き込みへ mode 伝播を追加
     - EMS / HOSPITAL / ADMIN home と stats で、TRAINING 中は本番 analytics を表示しない空表示導線を追加
     - EMS / DISPATCH の事案作成 UI に current mode badge と保存先説明を追加
     - Admin settings に training 一括リセット導線を追加
     - training mode focused E2E を追加
     - hospital consult 一覧と admin case 一覧にも mode filter を反映
     - 2026-04-13 に `training-mode.spec.ts` へ HOSPITAL / ADMIN の TRAINING analytics 非表示 regression を追加し、focused E2E 通過済み
   - 2026-04-13 確認:
     - `e2e/tests/training-mode.spec.ts` を再通過
     - HOSPITAL `patients` / `declined` の mode filter、HOSPITAL request 系 shell の currentMode、EMS `cases/search`、DISPATCH shell banner の補修が反映済み
     - ADMIN / DISPATCH は MFA 対象外方針と矛盾しないことを docs / code とも再確認済み
     - EMS / HOSPITAL / ADMIN の mode 設定画面に in-app の訓練ガイドを追加し、`DISPATCH` にも `settings` / `settings/mode` 導線を追加した
   - 次に拾う場合:
     - role page / notification edge case の微修正が入ったら focused E2E を追加追確認する
     - training analytics や demo dataset 運用は foundation 外の後続テーマとして別建てで扱う
   - 確定仕様:
     - ユーザーごとに `currentMode = LIVE | TRAINING`
     - `TRAINING mode` ユーザーのみ `TRAINING` 事案を作成可能
     - 同一 DB 内で LIVE / TRAINING は共存するが、表示・通知・集計では混入させない
     - 表示は mode ごとに完全分離
       - `LIVE mode` は `LIVE only`
       - `TRAINING mode` は `TRAINING only`
     - 事案ごとに `mode` を持ち、request / notification / patient に伝播
     - `DISPATCH / ADMIN / EMS` が training 事案を作成可能
     - training フローは搬送決定 / 辞退まで完走可能
     - training 通知は `TRAINING mode` かつ対象案件の関係者 scope のみ
     - training データは本番 analytics から完全除外
     - training データの一括リセットは `ADMIN` のみ
     - UI は常設バナー + header badge + 各事案 badge
     - 切替操作は設定ページ、header には mode 表示のみ
     - `ADMIN` も `LIVE / TRAINING` を切替可能
3. Admin / HOSPITAL 導線強化へ着手する
   - plan:
     - `docs/plans/2026-04-06-admin-hospital-intervention-design.md`
     - `docs/plans/2026-04-06-admin-hospital-intervention-implementation.md`
   - training foundation の次にやること:
     - Admin dashboard の problem-category drill-down を一覧導線へ実装済み
     - HOSPITAL priority sort を code 上で明示化済み
     - HOSPITAL 受入要請 / 相談一覧は、選定科目 priority を先に見てから status / 時刻順にするよう修正済み
     - `e2e/tests/hospital-flows.spec.ts` に critical department priority の focused E2E を追加済み
     - HOSPITAL detail panel の不足情報を補完済み
     - focused E2E の再確認は通過済み
     - 次は必要な微調整だけを拾う
   - 確定仕様:
     - Admin は個別案件へ介入しない
     - Admin は監視 / 分析 / drill-down に徹する
     - Admin の drill-down 優先順は `問題カテゴリ別 -> 病院別 -> 地域別`
     - HOSPITAL は自院宛案件へ直接対応する
     - ただし EMS 入力情報は編集しない
     - HOSPITAL priority sort は
       - 救命
       - CCU / CCUネットワーク / CCUネ
       - 脳卒中S / 脳S / 脳卒中A / 脳A
       - `NEGOTIATING` 停滞
       - `READ` 未返信
       - `UNREAD` 未読
       - `ACCEPTABLE` 未確定
       - 同順位は古いものを先
     - HOSPITAL detail panel は
       - 患者サマリー
       - 選定履歴
       - コメント履歴
       - 現在 status
       - 直近 action
       - 自院として次に押せる action
       を一画面で扱う
4. offline conflict handling 強化の詳細実装へ着手する
   - plan:
     - `docs/plans/2026-04-06-offline-conflict-handling-design.md`
     - `docs/plans/2026-04-06-offline-conflict-handling-implementation.md`
   - Admin / HOSPITAL 導線強化の次にやること:
     - server snapshot の保持方式を実装済み
     - conflict classification を型と UI 文言へ反映済み
     - `Offline Queue` detail panel を正本導線として拡張済み
     - focused E2E の再確認は通過済み
     - 次は conflict detail の微調整が入った場合だけ追加確認する
   - 確定仕様:
     - 初期段階では自動マージしない
     - まず `snapshot 基盤 -> conflict classification -> diff UI`
     - conflict 時の選択肢は
       - `server を採用`
       - `local を採用して再保存`
       - `あとで確認する`
     - 初期対象は `case draft` のみ
     - request 状態や搬送決定系は初期段階では server 優先に寄せる
     - conflict 確認 UI は `Offline Queue` 一覧から detail panel / modal で開く構成を正本にする
     - `あとで確認する` を選んだ案件は `Offline Queue` に conflict 状態のまま残し、`retry all` では自動スキップする
5. 実装前提
   - 新規テーマはすべて [UI_RULES.md](/C:/practice/medical-support-apps/docs/UI_RULES.md) と existing shared pattern 前提で設計する
   - 既存 design system を使えない場合だけ例外理由を plan に明記する
   - 100件 bulk dataset とフル E2E は現状維持し、新テーマ実装後の regression に再利用する

次回開始文言:

`docs/current-work.md の 3-2 を起点に、security / operations hardening の残件整理から再開してください。device fingerprint / 登録情報の強化、backup run report のジョブ連携、hospitalCache 暗号化、DB at-rest 要件反映は対応済みです。admin / dispatch を後回しにする場合は、次は training mode regression と UI layout hardening から進めてください。新規 UI は既存 design system 準拠を必須としてください。`

### 3-3. 整理するもの

- design system 移植作業はここで一旦区切り済み
  - 今後は新規機能を既存 design system 準拠で実装する
  - settings overview の共通文法化まで反映済み。以後は overview / detail の両方で shared pattern を正本とする
- UI 本線の Admin / HOSPITAL 導線強化、training mode guidance、role shell / settings hardening は focused E2E 通過まで完了済み
  - 以後の UI 作業は新規 workflow 追加か、既存画面の局所改善が起点
- `search score snapshot` 高度化は引き続き優先外
  - 距離順 + 現行 score で当面維持する
- 監査の追加テーマ化は後続に回す
- `offline diff/automerge` は「広い automerge」ではなく「conflict handling 強化」として再定義して扱う

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

- 2026-04-09 security / operations hardening Step 1-2 初回実装
  - `npm run typecheck` 通過
  - `npx.cmd playwright test e2e/tests/role-shells.spec.ts --grep "EMS settings pages render the workbench header and key actions"` 通過
  - `npx.cmd playwright test e2e/tests/role-shells.spec.ts` は初回のみ dev server compile 中の skeleton で EMS ケースが timeout
  - HOSPITAL / DISPATCH は同 run で通過しており、EMS も warm 後の focused rerun で通過
- 2026-04-11 security / infrastructure gap Phase 1
  - `npm run typecheck` 通過
  - `npm run lint` 通過
  - `npx.cmd playwright test e2e/tests/security-ops-monitoring.spec.ts` 通過
- 2026-04-09 device registration code flow を追加
  - `npm run typecheck` 通過
  - `npx.cmd playwright test e2e/tests/device-registration.spec.ts` 通過
  - `npx.cmd playwright test e2e/tests/role-shells.spec.ts` 再通過
- `npm run check:full` 通過
- `npm run check` 通過
- `npx.cmd playwright test e2e/tests/training-mode.spec.ts` 通過
- 2026-04-06 再確認
  - `npx.cmd playwright test e2e/tests/training-mode.spec.ts` 通過
  - `npx.cmd playwright test e2e/tests/admin-hospital-intervention.spec.ts` 通過
  - `npx.cmd playwright test e2e/tests/ems-offline.spec.ts --grep "inspect conflict classification and defer review"` 通過
  - `agent-browser` で ADMIN dashboard と EMS Offline Queue の snapshot-first browser verification を実施
  - 当初 3 spec を並列で回したため、`training-mode.spec.ts` が `e2e_ems_a` の mode を切り替えて offline spec と競合した
  - focused Playwright は同一 E2E user / shared state を触る spec を並列実行しない
- 2026-04-06 training edge case の追加補修
  - HOSPITAL `patients` / `declined` 一覧へ mode filter を追加
  - HOSPITAL `requests` / `consults` / `patients` / `declined` / `medical-info` shell へ currentMode を伝播
  - EMS case detail を `authorizeCaseReadAccess` 経由に戻し、mode bypass を解消
  - `CaseFormPage` edit に currentMode を渡し、TRAINING 表示で live 固定文言にならないよう修正
  - EMS `cases/search` を server wrapper + client content に分離し、TRAINING banner が表示されるよう補修
  - DISPATCH shell に currentMode を渡し、`dispatch/cases` に TRAINING banner / mode badge を表示するよう補修
  - `npx.cmd playwright test e2e/tests/training-mode.spec.ts` 通過
  - `components/cases/CaseSearchPageContent.tsx` の既存 type error を補修
  - `npm run check:full` 通過
- `npx.cmd playwright test e2e/tests/admin-hospital-intervention.spec.ts`
  - localhost の `/login` 応答が不安定で `page.goto(...): ERR_ABORTED`
- `npx.cmd playwright test e2e/tests/ems-offline.spec.ts --grep "inspect conflict classification and defer review"`
  - localhost の `/login` 応答が不安定で `page.goto(...): ERR_ABORTED`
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
- 2026-04-06 の E2E 安定化対応を実施
  - bulk spec が E2E 共通 fixture を壊したまま終了していたため、`bulk-case-views.spec.ts` と `bulk-case-mutations.spec.ts` に fixture 復元を追加
  - `admin-cases.spec.ts`、`cases-access.spec.ts`、`ems-case-findings.spec.ts` の locator / 文言を現行 UI に合わせて更新
  - `operational-alerts.spec.ts`、`send-history-safety.spec.ts` は spec 単位で fixture 初期化し、前段 mutation の影響を遮断
  - `ActionLinkPanel` と `PriorityListPanel` は server/client 境界で落ちない props 形へ修正
  - `npm run check` 通過
  - `npm run test:e2e` 通過
- docs 直下に全体俯瞰用の入口を追加
  - [project-feature-inventory.md](/C:/practice/medical-support-apps/docs/project-feature-inventory.md)
  - [project-status-summary.md](/C:/practice/medical-support-apps/docs/project-status-summary.md)
- operations / proposal docs を再整理し、`docs/operations/` と `docs/proposals/` の本文を現行実装ベースへ拡充
  - 運用手順は対象画面、判断基準、記録項目、関連 runbook を含む粒度へ更新
  - PoC 説明資料は現場導線、管理導線、運用保全、次段階の残件が説明できる内容へ更新
- 認証 / 端末運用の共通ガイドを追加
  - `docs/operations/auth-device-operations-guide.md` に ID と username の違い、端末登録から運用開始、紛失時の新端末引継ぎを整理
  - `ADMIN / 設定 / セキュリティ` に資料ページを追加し、フローチャート風の流れと原本導線を表示
- 新テーマ 3 本の plan 文書を追加
  - [2026-04-06-training-mode-design.md](/C:/practice/medical-support-apps/docs/plans/2026-04-06-training-mode-design.md)
  - [2026-04-06-training-mode-implementation.md](/C:/practice/medical-support-apps/docs/plans/2026-04-06-training-mode-implementation.md)
  - [2026-04-06-admin-hospital-intervention-design.md](/C:/practice/medical-support-apps/docs/plans/2026-04-06-admin-hospital-intervention-design.md)
  - [2026-04-06-admin-hospital-intervention-implementation.md](/C:/practice/medical-support-apps/docs/plans/2026-04-06-admin-hospital-intervention-implementation.md)
  - [2026-04-06-offline-conflict-handling-design.md](/C:/practice/medical-support-apps/docs/plans/2026-04-06-offline-conflict-handling-design.md)
  - [2026-04-06-offline-conflict-handling-implementation.md](/C:/practice/medical-support-apps/docs/plans/2026-04-06-offline-conflict-handling-implementation.md)
- training mode foundation の Step 1 を開始
  - `users.current_mode` foundation
  - `/api/settings/user-mode`
  - EMS / HOSPITAL / ADMIN settings の mode 切替画面
  - settings shell の training banner
  - `npm run check` 通過
- training mode foundation の Step 2 を開始
  - `cases.mode`、`hospital_requests.mode`、`hospital_patients.mode`、`notifications.mode` を schema foundation に追加
  - case search、hospital request list/detail、dispatch case list、notifications に LIVE / TRAINING filter を追加
  - send history、consult comment、hospital response、transport decision で mode を downstream に伝播
  - `npm run check` 通過
- training mode foundation の Step 3 を開始
  - EMS / HOSPITAL / ADMIN home と stats は、TRAINING 中に本番 analytics を表示しない導線へ更新
  - EMS / DISPATCH の create UI に current mode badge と `TRAINING only` 保存先説明を追加
  - `npm run check` 通過
- `npx.cmd playwright test e2e/tests/hospital-flows.spec.ts e2e/tests/operational-alerts.spec.ts` 通過
  - HOSPITAL 通知 dedupe / ack 通過
  - EMS / HOSPITAL consult stalled 通過
  - UI 再構築後の locator を更新済み
- `dashboardAnalytics.ts` の KPI を Phase 2 定義へ整理済み
- `search score snapshot` は送信履歴 payload と DB 保存先を同時設計すべきと判断し、Phase 2 では見送り
- `npx.cmd playwright test e2e/tests/role-shells.spec.ts` 通過
  - EMS / HOSPITAL settings と DISPATCH shell header の focused E2E を追加して確認
  - loading.tsx は build 対象として `npm run check:full` で確認し、追加の focused E2E は不要と判断
- 2026-04-19 Admin 設定 master summary のブラウザエラー補修
  - `hospital_department_availability` など未作成テーブル参照で `/admin/settings/master` が落ちる経路を `lib/admin/adminSettingsRepository.ts` で吸収した
  - `npm run check` 通過
  - `npm run check:full` 通過
- 2026-04-19 Admin Server Component 本番エラー補修
  - `lib/dbIntrospection.ts` を追加し、table / column 存在確認を共通化した
  - `lib/authContext.ts` は `users.current_mode` 未適用時に `LIVE` fallback で読むよう変更した
  - `lib/admin/adminMonitoringRepository.ts` と `lib/admin/adminSettingsRepository.ts` は render 時の schema ensure をやめ、`login_attempts`、`system_monitor_events`、`backup_run_reports`、`notifications` の不足時も 0 / 未報告 へフォールバックするよう変更した
  - `npm run check` 通過
  - `npm run check:full` 通過
- 2026-04-19 HOSPITAL home 本番エラー補修
  - `/hospitals` と `/hospitals/stats` の `getHospitalDashboardData()` は、`ensureCasesColumns()` / `ensureHospitalRequestTables()` の requirement 未充足時に例外送出ではなく empty dashboard へフォールバックするよう変更した
  - `lib/schemaRequirements.ts` に requirement error 判定 helper を追加した
  - 本番 DB migration 未適用が残っていても、病院ホーム自体は開けるように寄せた
  - `npm run check` 通過
  - `npm run check:full` 通過
- 2026-04-19 HOSPITAL notifications / requests 本番止血
  - Vercel logs で `/api/notifications` と `/hospitals/requests` が `ensureHospitalRequestTables` requirement 未充足により 500 になっていることを確認した
  - `app/api/notifications/route.ts` は requirement error 時に空通知 / 更新 0 を返すよう変更した
  - `app/hospitals/requests/page.tsx` と `app/api/hospitals/requests/route.ts` は requirement error 時に empty rows を返すよう変更した
  - migration 未適用の本番 DB でも HOSPITAL shell と通知ベルが落ちにくい形へ寄せた
  - `npm run check` 通過
  - `npm run check:full` 通過
- 2026-04-19 通知起点の体感遅延を補修
  - `components/shared/NotificationBell.tsx` は通知 click 時の `PATCH -> GET -> router.push()` 直列待ちをやめ、既読状態を local optimistic update して即 navigation するよう変更した
  - 通知一覧に出ている遷移先は bell 側で最大 6 件まで `router.prefetch()` するようにし、通知から事案 / 各メニューを開く初動を短くした
  - `lib/notifications.ts` は operational notification materialize を `user + mode` 単位の 30 秒キャッシュにし、summary/list query も `Promise.all` で並列化した
  - `app/api/notifications/route.ts` は schema requirement check と auth 解決を並列化した
  - `npm run check` と `npm run check:full` を通して整合を確認する
- 2026-04-19 EMS/HOSPITAL 導線の体感遅延と focused E2E を補修
  - `lib/authContext.ts`、`lib/emsOperator.ts`、`lib/hospitalOperator.ts` は `react cache` 化し、同一 request 内の auth/session 再解決を減らした
  - `app/api/cases/search/[caseId]/route.ts` は `caseUid` 解決と team scope 判定を先に行い、`listCaseSelectionHistoryByCaseUid()` で履歴取得を二度引きしない形へ寄せた
  - `components/cases/CaseSearchPageContent.tsx` は一覧初期表示時と展開時に `/cases/[caseId]` を prefetch するよう変更した
  - `e2e/global-setup.ts` は `hospital_request_events` / `hospital_request_targets` cleanup と `hospital_requests.mode` / `first_sent_at` seed を追加し、navigation perf 用 fixture を現行 schema に合わせた
  - `e2e/tests/navigation-perf.spec.ts` を追加し、EMS の `一覧 -> 展開 -> 詳細` と HOSPITAL の主要導線を focused 計測できるようにした
  - HOSPITAL 側 spec は `Escape` ではなく detail modal の close button を使うよう補修した
  - managed `next dev` 下の cold compile ぶれを踏まえ、EMS 閾値は 4.5s、HOSPITAL 閾値は 3.5s に設定した
  - `npm run check` と `npx.cmd playwright test e2e/tests/navigation-perf.spec.ts` を通過
- 2026-04-19 EMS navigation speed loop の第2バッチを実施
  - design:
    - `docs/plans/2026-04-19-ems-navigation-performance-design.md`
  - implementation:
    - `docs/plans/2026-04-19-ems-navigation-performance-implementation.md`
  - `components/home/Sidebar.tsx` は EMS の主要 route を idle prefetch するよう変更した
  - `components/cases/CaseSearchPageContent.tsx` は一覧 API 応答直後に detail route prefetch と上位4件の送信履歴 prewarm を開始し、初回通知 fetch は一覧表示後へ後ろ倒しした
  - `app/api/cases/search/route.ts` は schema check と auth 解決を並列化した
  - `lib/caseSelectionHistory.ts` は `caseUid` が既知の経路で `hospital_requests` 起点の軽量 query を使えるようにした
  - `app/cases/[caseId]/page.tsx` は detail row 再取得を `case_uid` 直指定に寄せた
  - `components/cases/CaseFormPage.tsx` は `summary / vitals / history` tab を dynamic import 化した
  - focused benchmark の before / after:
    - `ems:paramedics->cases-search`  `2847.4ms -> 762.3ms`
    - `ems:case-expand`  `3846.5ms -> 2796.2ms`
    - `ems:case-detail-open`  `3408.0ms -> 3236.9ms`
  - 一覧遷移と一覧展開は明確に改善し、残る主論点は detail page の巨大 client component 初回表示コストへ絞られた
  - `npm run check` と `npx.cmd playwright test e2e/tests/navigation-perf.spec.ts` を通過
- 2026-04-19 Admin/HOSPITAL navigation speed loop の第2バッチを実施
  - design:
    - `docs/plans/2026-04-19-admin-hospital-navigation-performance-design.md`
  - implementation:
    - `docs/plans/2026-04-19-admin-hospital-navigation-performance-implementation.md`
  - `components/admin/AdminSidebar.tsx` と `components/hospitals/HospitalSidebar.tsx` は主要 route を idle prefetch するよう変更した
  - `app/api/admin/cases/route.ts` は schema check と auth 解決を並列化し、一覧 response に上位3件の `prefetchedHistory` を含めるよう変更した
  - `app/api/admin/cases/[caseId]/route.ts` は `case_uid` 既知経路で `listCaseSelectionHistoryByCaseUid()` を使うよう変更した
  - `components/admin/AdminCasesPage.tsx` は detail / history cache と in-flight request dedupe を追加し、一覧表示後に上位2件の detail を background prewarm するよう変更した
  - `components/hospitals/useHospitalRequestApi.ts` は detail / consult messages cache を追加し、`HospitalRequestsTable` は先頭4件の detail を background prewarm するよう変更した
  - `e2e/tests/navigation-perf.spec.ts` に ADMIN 導線の focused benchmark を追加した
  - focused benchmark の latest:
    - `hospital:home->requests` `1358.6ms`
    - `hospital:request-detail-open` `75.9ms`
    - `hospital:requests->consults` `1557.7ms`
    - `hospital:consults->patients` `1485.2ms`
    - `admin:home->cases` `965.8ms`
    - `admin:case-expand` `1558.5ms`
    - `admin:case-detail-open` `1142.6ms`
  - HOSPITAL は既に高速だった detail modal を維持したまま、一覧間遷移も 1.3s-1.6s 台で安定した
  - ADMIN は case 一覧遷移と詳細導線が 1s 前後まで縮み、残る主論点は一覧 API 自体ではなく detail workbench 側の初回描画コストへ移った
  - `npm run check` と `npx.cmd playwright test e2e/tests/navigation-perf.spec.ts` を通過
- 2026-04-13 に一覧 card style の横展開を実施
  - `SearchResultsTab` を 1病院1カード + card click 選択へ変更
  - 病院検索導線内の送信履歴 / 送信前確認候補も card style へ変更
  - `dispatch/cases`、`hospitals/declined`、`OfflineQueuePage` を table から card list へ変更
  - `CaseSelectionHistoryTable` の `compact` variant を card list 化し、admin case 履歴にも反映
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
- design system Phase 2 の initial pattern seed を追加
  - `ActionFooter`、`DetailMetadataGrid`、`TablePagination`、`DetailDialogFrame`、`KpiPanel`、`SplitWorkbenchLayout` を shared component として追加
  - `AdminCasesPage` を `一覧 + 詳細` の split workbench composition へ移行
  - `HospitalHomeKpiSection` を `KPI panel` seed へ移行
  - `HospitalRequestDetail`、`SearchResultsTab`、`TransferRequestConfirmPage`、`HospitalPatientsTable`、`HospitalRequestsTable`、`HospitalConsultCasesTable` に pattern seed を適用
  - `npm run check` 通過
- design system Phase 2 の admin / dashboard 横展開を追加
  - `AdminLogsPage`、`AdminUsersPage`、`AdminOrgsPage`、`AdminDevicesPage`、`AdminEntityPage` に `SplitWorkbenchLayout` を適用
  - `AdminLogsPage`、`AdminUsersPage`、`AdminOrgsPage`、`AdminDevicesPage` の detail / row metadata を `DetailMetadataGrid` に寄せた
  - `HomeDashboard` の `AVERAGE TIME KPI` と `QUICK READ` を `KpiPanel` へ移行
  - `npm run check` 通過
- `AdminLoading` の skeleton も pattern に追従
  - hero section を `ds-panel-surface--hero` に寄せ、2 pane skeleton は `SplitWorkbenchLayout` を使う構成へ更新
  - `npm run check` 通過
- Phase 2 の再点検を実施
  - `AdminEntityTable` の row metadata card と empty state を `DetailMetadataGrid` / `ds-muted-panel` に寄せた
  - `npm run check` 通過
- `KpiBacklogSection` を追加
  - EMS home は `analytics summary + quick actions rail`、HOSPITAL home は `KPI summary + priority cases/routes rail` の composition に移行
  - `npm run check` 通過
- shared pattern を追加で横展開
  - `SelectableRowCard` を admin selectable row 群に適用
  - `AuditTrailList` を admin editor の監査履歴表示に適用
  - `ActionLinkPanel` を EMS / HOSPITAL / ADMIN home の route/action rail に適用
  - `PriorityListPanel` を HOSPITAL / ADMIN home の priority rail に適用
  - `npm run check` 通過
- 判断保留の整理を実施
  - `CompactBars` と `CompactMetricList` は現時点では統合しない
  - dashboard hero header は role 固有差を優先し、共通 shell 化を保留
  - backlog watch callout は `KpiBacklogSection` 内の局所表現として維持
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
- design system Phase 2 の初回 pattern 抽出を実施
  - `ActionFooter`、`DetailMetadataGrid`、`TablePagination`、`DetailDialogFrame` を追加
  - `AdminCasesPage`、`HospitalRequestDetail`、`SearchResultsTab`、`TransferRequestConfirmPage`、`HospitalPatientsTable`、`HospitalRequestsTable`、`HospitalConsultCasesTable` を pattern seed として載せ替えた
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
- `npm run check` / `npm run typecheck` が `.next/dev/types/*.ts` の壊れた生成物で落ちた場合は、実装差分より先に `.next/dev/types` を削除して再生成させる
- `hospital_patients(case_uid)` の unique 制約は、重複掃除後に張る前提
- 次回は本書の `3. 次回実施すること` から再開する
- `schema_migrations` 導入後は、既に manifest に載っている `setup_*.sql` を直接編集しない。変更は必ず新しい migration ファイルで追加する
- オフライン競合は `手動解決`、`server優先`、`事案フォーム再保存` を前提とする
- offline conflict handling の初期導線は `Offline Queue` を正本にし、`retry all` は conflict 案件を自動スキップする
- bulk dataset の現在値は `scripts/manage_case_load_test_data.js` を正本にする
- 2026-04-13 時点の開発 DB は 10000件 performance dataset のままになっている。`verify --expected 100` は失敗し、`verify --expected 10000` が現行値に合う
- 100件 baseline に戻して mutation / bulk UI 回帰を再実施したい場合は、`reset` -> `seed --count 100` -> `verify --expected 100` を明示的にやり直す
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
- Phase 2 は page-level 直書きを減らしつつ、一覧 / 詳細 / overlay / KPI を pattern 単位でまとめる
- 次の Phase 2 seed は `KPI + backlog` と `一覧 + 詳細` の page composition
- 今後の新規機能 / 新規ページ / 新規 workflow 画面は、必ず [UI_RULES.md](/C:/practice/medical-support-apps/docs/UI_RULES.md) と既存 shared pattern を正本として設計する
- one-off class や個別 visual だけで新規画面を組むのは原則禁止とし、やむを得ない例外は plan に理由を残す
