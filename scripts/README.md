# Scripts Guide

`scripts/` は「初期構築」「データ投入」「補修/保守」に分けて扱います。現時点のファイル分類は次のとおりです。

## 初期構築

- `setup_auth.sql`
- `setup_departments.sql`
- `setup_hospital_requests.sql`

## データ投入 / シード

- `seed_auth_users.js`
- `seed_neon.sql`
- `seed_hospital_departments_demo.sql`
- `ambulance_teams_dataset.js`
- `load_neon_seed.py`

## 補修 / 保守

- `backfill_hospital_requests.js`
- `manage_case_load_test_data.js`
- `realign_ems_users.js`
- `renumber_ambulance_team_codes.js`
- `renumber_ambulance_team_ids.js`
- `replace_ambulance_teams.js`
- `execute_sql.js`

運用ルール:

- テーブル作成系は `setup_*`、データ投入系は `seed_*`、補修系は `backfill_*` / `realign_*` / `replace_*` のように目的が伝わる接頭辞を使う。
- 一回限りのスクリプトでも、再実行注意や対象データをこの README かファイル冒頭コメントに残す。
- 破壊的変更の可能性があるものは、実行前に対象 DB とバックアップ有無を確認する。
