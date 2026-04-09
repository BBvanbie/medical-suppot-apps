# 2026-04-09 Operations / Explanation Docs Design

## 目的

- 未整備だった運用手順、説明資料、外部説明用資料を `docs/operations/`、`docs/policies/`、`docs/proposals/` に整理し、導入前後の運用判断に使える状態にする。
- 「誰が何を判断し、どの資料を見ればよいか」が迷わない構成にする。

## 今回追加する文書群

### 運用フロー

- `operations-account-lifecycle.md`
- `lost-device-runbook.md`
- `incident-response-runbook.md`
- `support-contact-guide.md`
- `training-demo-runbook.md`
- `release-runbook.md`

### 方針書 / 説明資料

- `security-overview.md`
- `auth-authorization-policy.md`
- `infrastructure-overview.md`
- `data-retention-policy.md`

### 導入 / 管理ガイド

- `deployment-onboarding-guide.md`
- `admin-operations-guide.md`

### 提案 / 外部説明

- `poc-overview.md`

## 設計方針

- 実運用で参照する文書は `docs/operations/` に置く。
- 方針書と説明資料は `docs/policies/` に置く。
- 提案や PoC 用の説明資料は `docs/proposals/` に置く。
- 参照専用の一覧や棚卸し資料は `docs/reference/` に置く既存方針を維持する。
- 1 文書 1 目的を基本とし、長い総合文書に寄せすぎない。
- 既存の `device-registration-guide.md` と `backup-restore-runbook.md` を新しい運用文書群から参照する。

## 期待する出口

- アカウント発行、異動 / 退職、紛失対応、障害対応、保持方針、問い合わせ導線が文章で固定される。
- セキュリティ、認証 / 認可、インフラ、データ取扱い、PoC 説明の外部向け素材が揃う。
- 導入手順と運用管理者向け手順が揃い、初期導入と日常運用を別資料で辿れる。
