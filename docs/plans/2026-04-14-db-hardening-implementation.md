# DB hardening / inventory implementation task list

更新日: 2026-04-14

## 実装タスク

### Phase 0: inventory 固定

1. `docs/reference/db-table-inventory-2026-04-14.md` を正本にして、全テーブルの役割と削除可否を固定する
2. `docs/reference/db-query-inventory-2026-04-14.md` を正本にして、主要 query 群と削除 / 統合候補を固定する
3. `docs/current-work.md` に DB hardening を再開テーマとして追加する

### Phase 1: schema 正本化

1. `notifications` の dedupe unique index を正式 migration 化する
   - 既存重複 cleanup SQL を migration に取り込む
   - `lib/hospitalRequestSchema.ts` と `scripts/setup_hospital_requests.sql` の差分を解消する
   - 2026-04-19: `scripts/setup_hospital_requests.sql` に runtime 要件の index / backfill / 補助列 / 補助 table を反映し、差分解消を進めた
2. `cases` / `hospital_requests` / `notifications` / `hospital_patients` の必須 index と constraint を migration ベースに揃える
   - 2026-04-19: setup SQL では required index / constraint / backfill を揃え、runtime は verify-only へ移行した
3. `ensureCasesColumns()` / `ensureHospitalRequestTables()` の `42501` スキップを fail fast へ変更する方針を実装する
   - 2026-04-14: runtime code 側は実施済み
4. migration 完了後、runtime schema mutate を縮退させる
   - 2026-04-19: `lib/casesSchema.ts` / `lib/hospitalRequestSchema.ts` は schema requirement verify-only へ切り替え済み
   - 2026-04-19: `schema_migrations` と `db:migrate` / `db:migration:status` を追加し、setup SQL に対する version 記録を導入した
   - 2026-04-19: migration manifest は immutable snapshot (`scripts/migrations/*.sql`) を参照する形へ切り替え、現行開発 DB の legacy record も reconcile 済み
   - 残りは setup SQL 直編集中心の運用をやめ、差分 migration 追加中心へ固定すること

対象ファイル:
- `lib/casesSchema.ts`
- `lib/hospitalRequestSchema.ts`
- `scripts/setup_cases_schema.sql`
- `scripts/setup_hospital_requests.sql`

### Phase 2: query hardening

1. `lib/dashboardAnalytics.ts` の legacy fallback query を削除する
   - 2026-04-14: 実施済み
2. migration 未適用時の analytics は silent fallback ではなく障害化する
3. `resolveCaseByAnyId` と `resolveCaseAccessContext` を共有 helper へ統合する
4. request detail / consult コメント抽出 query の共通化を検討する

対象ファイル:
- `lib/dashboardAnalytics.ts`
- `lib/caseAccess.ts`
- `app/api/cases/send-history/route.ts`
- `lib/hospitalRequestRepository.ts`

### Phase 3: 冪等性 / 履歴保全

1. `hospital_request_events` の `sent` event を request 再送で重複しないようにする
   - 2026-04-14: `same request_id + same hospital_id` では初回だけ `sent` event / notification を作成する形へ実装済み
2. `notifications` の dedupe 前提を schema とコードで一致させる
3. `hospital_patients` の競合制御と rollback ケースを再確認する
4. `ON DELETE CASCADE` のうち履歴喪失リスクがある箇所を `SET NULL` / 論理削除方針へ見直す
   - 2026-04-14: `notifications` は `SET NULL`、`hospital_request_targets / events / patients` の主要 FK は `RESTRICT` 方向へ実装済み
   - 2026-04-19: `migration_20260419_0009_hospital_request_fk_hardening.sql` を適用し、現行開発 DB でも `RESTRICT` へ移行済み

### Phase 3.5: 送信時刻の意味整理

1. `hospital_requests.first_sent_at` を初回送信時刻として保持する
   - 2026-04-14: runtime schema / setup script / send-history upsert に反映済み
2. `hospital_requests.sent_at` は最終送信時刻として扱う
3. EMS / ADMIN analytics の `HP決定` 指標は `最終送信` 基準へ合わせる

### Phase 3.6: case 解決 helper 統合

1. `resolveCaseByAnyId` を shared helper 化する
   - 2026-04-14: `lib/caseAccess.ts` に集約し、`send-history` のローカル重複実装を削除済み

対象ファイル:
- `app/api/cases/send-history/route.ts`
- `lib/sendHistoryStatusRepository.ts`
- `lib/notifications.ts`
- `lib/hospitalRequestSchema.ts`

### Phase 4: 性能計測

1. `scripts/check_query_performance.mjs --explain` の対象 query を inventory と整合させる
   - 2026-04-19: `notifications_list_for_ems_user` を追加し、通知一覧の実 query に近い形を測定対象へ入れた
   - 2026-04-19: `cases_search_keyword` と `admin_cases_filtered_search` も追加し、検索系 API の実 query に近い形を計測対象へ入れた
2. 本番相当データ量で `cases search`、`admin cases`、`dashboardAnalytics`、`notifications` を計測する
   - 2026-04-19: 通知一覧 / 未読集計 / 既読更新の scope query は scoped split へ寄せた
   - 2026-04-19: `admin cases` は `filtered_cases` CTE で base filter を先に適用する形へ変更し、病院名込み search の ad hoc `EXPLAIN` は約 168ms -> 約 0.8ms まで改善した
   - 2026-04-19: `cases search` は OR を `matched_cases` に分解し、trigram index を使う plan へ寄せた。ただし 2文字程度の日本語 keyword は選択性が低く residual risk がある
3. 必要なら `pg_trgm` と trigram index の導入 plan を切る
   - 2026-04-19: `migration_20260419_0010_search_trgm_indexes.sql` を追加し、`cases` / `emergency_teams` / `hospitals` の検索列へ trigram index を導入した
4. index 削除候補は `EXPLAIN ANALYZE` で裏付けてから決める

対象ファイル:
- `scripts/check_query_performance.mjs`
- `app/api/cases/search/route.ts`
- `app/api/admin/cases/route.ts`
- `lib/dashboardAnalytics.ts`
- `lib/notifications.ts`

## 削除対象一覧

### 先に削除してよい候補

`dashboardAnalytics` fallback query
- 理由: legacy 互換ではなく別集計を返す
- 条件: migration 完了確認後

### migration 後に削除候補へ上げるもの

`runtime schema mutate`
- 対象: `lib/*Schema.ts` のうち本番 mutate 用の SQL
- 理由: setup script / migration と重複している
- 条件: 正式 migration と version check 導入後

### 今回は削除対象にしないもの

`コアテーブル`
- 理由: 全テーブルに現行参照が残っている

`index`
- 理由: 実測なしでは削除判断が危険

## 検証

1. migration 適用後に `npm run check`
2. `npm run db:verify`
   - 2026-04-19: `.env.local` の `DATABASE_URL` を読み込んだ実行で通過
3. `npm run db:migration:status`
   - 2026-04-19: 現行開発 DB で全 migration が `APPLIED / OK` を確認
4. 本番相当データで `node scripts/check_query_performance.mjs --explain`
   - 2026-04-19: 現行開発 DB では fail / warn なし。`notifications_unread_scope` は index scan を確認
   - 2026-04-19: `notifications_list_for_ems_user` も bitmap index scan ベースで確認
   - 2026-04-19: `markNotificationsRead()` 相当の ad hoc `EXPLAIN` でも、scope 抽出側は bitmap index scan ベースへ寄った
   - 2026-04-19: `admin_cases_filtered_search` は `filtered_cases` 形で bitmap index scan ベースへ改善した
   - 2026-04-19: `cases_search_keyword` は trigram index を使う形へ移ったが、短い日本語 keyword では bitmap recheck が大きくなるため継続観察が必要
5. 送信履歴、通知、analytics、病院一覧の focused E2E / API確認
