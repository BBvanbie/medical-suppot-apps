# Admin コンプライアンス運用記録レジャー拡張メモ

日付: 2026-04-22

## 目的

- 初期実装した `compliance_operation_runs` を、将来の導入施設単位運用と監査整合に耐える形へ拡張する。

## 確定方針

- scope は `organization_scope + organization_id` を採用する
- scope ごとの採番は既存主キーをそのまま使う
  - `hospital -> hospitals.id`
  - `ems -> emergency_teams.id`
  - `admin / shared -> compliance_operating_units.id`
- 将来の追加整合用に `compliance_organization_registry` を持ち、`hospitals` / `emergency_teams` / `compliance_operating_units` から同期する
- 記録は `追記のみ` を正本にする
- 訂正は `supersedes_run_id` による訂正レコード追加で表現する
- 証跡は `evidence_type / evidence_location / evidence_reference / evidence_notes` で構造化する
- 保持期間は `5年`
- 削除前提ではなく `retention_until + archived_at` を持ち、先にアーカイブ可能にする

## 実装対象

- `scripts/migration_20260422_0013_compliance_operation_run_expansion.sql`
- `scripts/migration_20260422_0014_compliance_scope_id_rules.sql`
- `scripts/migration_20260422_0015_compliance_organization_registry.sql`
- `scripts/migration_20260422_0016_compliance_operating_units.sql`
- `scripts/migration_manifest.js`
- `scripts/verify_schema_requirements.mjs`
- `lib/admin/adminComplianceRepository.ts`
- `components/admin/AdminComplianceRunForm.tsx`
- `app/admin/settings/compliance/page.tsx`
- `app/api/admin/compliance-operating-units/route.ts`
- `components/admin/AdminComplianceOperatingUnitManager.tsx`
- `lib/admin/adminComplianceDefinitions.ts`

## UI 方針

- `/admin/settings/compliance` の入力フォームは拡張 schema を直接扱えるようにする
- 入力可能項目は `operation / organization_scope / organization_id / completed_at / next_due_at / supersedes_run_id / evidence_type / evidence_location / evidence_reference / evidence_notes / notes`
- 対象組織は raw ID 手入力ではなく registry 候補選択にする
- `hospital / ems / admin / shared` の全 scope で registry に存在する active 組織 ID を必須にする
- registry に存在しない ID は API 側でも reject する
- 訂正は編集ではなく `訂正元レコード` を選んで追記する
- 直近記録一覧にも `scope / evidence type / evidence reference / supersedes / retention` を表示する
- 保持期間 `5年` と `archived_at` による先アーカイブ方針を画面文言で明示する

## 非目標

- 承認ワークフロー
- 添付ファイル保管
- 実施設データ投入

## 完了条件

- schema が拡張後要件を満たす
- registry と source sync が追加され、今後の病院 / EMS / 運用主体追加に追従できる
- repository が新列を扱える
- Admin UI が新列を入力・確認できる
- Admin UI から `admin / shared` の運用主体追加、active 切替、表示名更新ができる
- focused E2E で運用主体の create / update を確認できる
- `npm run check`、`npm run db:migrate`、`npm run db:verify` が通る

## 追加実施記録

### 2026-04-22 follow-up

- `/admin/settings/compliance` に `OPERATING UNITS` 管理 UI と `REGISTRY` 一覧を追加した
- `admin / shared` の運用主体は raw ID ではなく registry-backed option として扱い、追加・更新後は `compliance_organization_registry` に同期される
- `lib/admin/adminComplianceDefinitions.ts` を切り出し、client component が server-only repository を import しないよう整理した
- `components/admin/AdminComplianceRunForm.tsx` に対象組織検索を追加し、scope ごとに registry 候補を絞り込めるようにした
- `components/admin/AdminComplianceRegistryPanel.tsx` を追加し、registry を全文表示 + 検索で確認できるようにした
- `e2e/tests/admin-hospital-guidance.spec.ts` に `ADMIN can create and update compliance operating units` を追加した
- 同 spec で、operating unit の create / update 後に registry 検索と対象組織検索が機能することも確認対象へ加えた
- 確認:
  - `npm run check`
  - `npm run db:migrate`
  - `npm run db:verify`
  - `npx playwright test e2e/tests/admin-hospital-guidance.spec.ts e2e/tests/training-mode.spec.ts --reporter=line`
