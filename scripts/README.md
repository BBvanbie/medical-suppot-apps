# Scripts Guide

`scripts/` は「初期構築」「データ投入」「補修/保守」に分けて扱います。現時点のファイル分類は次のとおりです。

## 初期構築

- `setup_auth.sql`
- `setup_departments.sql`
- `setup_hospital_requests.sql`
- `setup_admin_management.sql`
- `setup_cases_schema.sql`
- `setup_security_auth.sql`
- `setup_settings.sql`
- `setup_system_monitor.sql`

## データ投入 / シード

- `seed_auth_users.js`
- `seed_neon.sql`
- `seed_hospital_departments_demo.sql`
- `seed_disaster_medical_center_test_requests.js`
- `ambulance_teams_dataset.js`
- `load_neon_seed.py`

病院検索をローカルで使う前提:

- `scripts/setup_departments.sql` で `medical_departments` と `hospital_departments` テーブルを作成する
- `scripts/seed_hospital_departments_demo.sql` で病院と診療科のデモ紐付けを投入する
- `hospital_departments` が空のままだと `/api/hospitals/recent-search` は検索結果0件ではなく初期化不足エラーを返す

## 補修 / 保守

- `backfill_hospital_requests.js`
- `manage_case_load_test_data.js`
- `migrate_device_key_hashes.js`
- `realign_ems_users.js`
- `renumber_ambulance_team_codes.js`
- `renumber_ambulance_team_ids.js`
- `replace_ambulance_teams.js`
- `run_backup_job.mjs`
- `verify_production_ops_env.mjs`
- `execute_sql.js`
- `bootstrap_schema.js`
- `db_migrate.js`
- `db_migration_status.js`
- `verify_schema_requirements.mjs`

運用メモ:

- `manage_case_load_test_data.js` は事案関連 dataset を `1000` / `10000` 件で作り直す用途を持つ。`reset` は事案関連データを削除するため、共有 DB では実行前に対象環境を必ず確認する。
- 2026-04-13 時点の性能確認は `10000` 件 dataset を前提に完了している。現在値確認は `node scripts/manage_case_load_test_data.js verify --expected 10000` を基準にする。
- `run_backup_job.mjs` は backup command の終了結果を `backup:report` に送る wrapper で、production 系 job から呼ぶ前提とする。
- `verify_production_ops_env.mjs` は production / staging の運用設定確認用で、ローカルの通常開発フローでは必須ではない。
- `bootstrap_schema.js` は互換入口で、中では `db_migrate.js` を呼ぶ。既存 `setup_*.sql` を migration manifest 順に適用し、`schema_migrations` に記録する。
- `db_migrate.js` は `schema_migrations` を作成し、未適用 migration だけを checksum 付きで記録しながら適用する。
- `db_migration_status.js` は manifest と `schema_migrations` を比較し、`APPLIED / PENDING / DRIFT` を確認する。
- `verify_schema_requirements.mjs` は `cases` と `hospital_requests` 系の required table / column / index / constraint を検査する。`setup_*.sql` 適用後の確認や、本番配備前の schema 漏れ検知に使う。

運用ルール:

- テーブル作成系は `setup_*`、データ投入系は `seed_*`、補修系は `backfill_*` / `realign_*` / `replace_*` のように目的が伝わる接頭辞を使う。
- 一回限りのスクリプトでも、再実行注意や対象データをこの README かファイル冒頭コメントに残す。
- 破壊的変更の可能性があるものは、実行前に対象 DB とバックアップ有無を確認する。
