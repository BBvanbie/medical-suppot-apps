# plans

このディレクトリは、日付付きの設計メモと実装メモを履歴として保持する。
「次にどこから始めるか」はここではなく、[current-work.md](/C:/practice/medical-support-apps/docs/current-work.md) を正本とする。

## 役割

- `docs/current-work.md`
  - 現在の最優先タスク
  - 次の具体手順
  - 完了済みと未完了
- `docs/workstreams/*.md`
  - テーマ別の状態整理
  - 残作業、完了条件、関連 plan
- `docs/plans/YYYY-MM-DD-*.md`
  - 設計判断と実装履歴

## 現在の主要 plan

- 認可 / 安全性
  - [2026-03-29-safety-hardening-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-29-safety-hardening-design.md)
- 通知
  - [2026-03-31-notification-ops-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-31-notification-ops-design.md)
- オフライン
  - [2026-03-31-offline-queue-recovery-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-31-offline-queue-recovery-design.md)
  - [2026-03-31-offline-conflict-resolution-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-31-offline-conflict-resolution-design.md)
- 大規模災害TRIAGE
  - [2026-04-27-mci-triage-incident-command-design.md](/C:/practice/medical-support-apps/docs/plans/2026-04-27-mci-triage-incident-command-design.md)
  - [2026-05-05-mci-triage-p0-requirements-design.md](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-requirements-design.md)
  - [2026-05-05-mci-triage-p0-db-design.md](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-db-design.md)
  - [2026-05-05-mci-triage-p0-api-contract-design.md](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-api-contract-design.md)
  - [2026-05-05-mci-triage-p0-ui-wireflow-design.md](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-ui-wireflow-design.md)
  - [2026-05-05-mci-triage-p0-e2e-acceptance-design.md](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-e2e-acceptance-design.md)
  - [2026-05-05-mci-triage-p0-foundation-implementation.md](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-foundation-implementation.md)
- セキュリティ / インフラ
  - [2026-04-12-db-column-encryption-decision.md](/C:/practice/medical-support-apps/docs/plans/2026-04-12-db-column-encryption-decision.md)

## ルール

- 新しい設計や運用変更は、必要に応じて日付付き plan を追加する
- 実装が既存 plan に基づく場合は、その plan と関連 workstream / current-work を更新する
- plan は履歴として残し、現在の再開点の代わりには使わない
