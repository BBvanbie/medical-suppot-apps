# Operations Docs

`docs/operations/` は、このプロジェクトを実際に運用する人向けの文書置き場です。対象は主に `ADMIN`、導入担当、運用責任者、障害一次対応者です。

## このディレクトリで扱うこと

- ユーザー発行、異動、停止、再開の流れ
- 端末登録、端末紛失、端末再配布の流れ
- バックアップ、復旧、障害一次対応
- TRAINING / DEMO の運用方法
- リリース前後の確認手順
- 問い合わせ受付時に聞くべき情報

## 文書一覧

- [admin-operations-guide.md](/C:/practice/medical-support-apps/docs/operations/admin-operations-guide.md)
  日次、週次、月次の運用確認と、`ADMIN` が実施する主要操作の入口。
- [auth-device-operations-guide.md](/C:/practice/medical-support-apps/docs/operations/auth-device-operations-guide.md)
  `ID` と `username` の違い、端末登録から運用開始、紛失時の新端末引継ぎを説明する共通ガイド。
- [backup-restore-runbook.md](/C:/practice/medical-support-apps/docs/operations/backup-restore-runbook.md)
  PostgreSQL バックアップ、監視記録、復旧時の動き方。
- [deployment-onboarding-guide.md](/C:/practice/medical-support-apps/docs/operations/deployment-onboarding-guide.md)
  新しい組織や現場を立ち上げるときの初期導入手順。
- [device-registration-guide.md](/C:/practice/medical-support-apps/docs/operations/device-registration-guide.md)
  `EMS` の iPad や `HOSPITAL` の PC を正式端末として登録する手順。
- [hp-pc-ems-ipad-registration-flow.md](/C:/practice/medical-support-apps/docs/operations/hp-pc-ems-ipad-registration-flow.md)
  `HOSPITAL PC` と `EMS iPad` を WebAuthn MFA と端末登録コードで再登録する具体手順。
- [fail-safe-runbook.md](/C:/practice/medical-support-apps/docs/operations/fail-safe-runbook.md)
  DB停止、通知失敗、部分障害時のロール別制限運転。
- [incident-response-runbook.md](/C:/practice/medical-support-apps/docs/operations/incident-response-runbook.md)
  システム停止、通知停止、同期不整合などの障害時の一次対応。
- [audit-review-runbook.md](/C:/practice/medical-support-apps/docs/operations/audit-review-runbook.md)
  日次、週次、月次の監査 / 点検と、異常時の是正判断。
- [bcp-restore-drill-runbook.md](/C:/practice/medical-support-apps/docs/operations/bcp-restore-drill-runbook.md)
  BCP、復元訓練、restore drill の進め方。
- [id-inventory-runbook.md](/C:/practice/medical-support-apps/docs/operations/id-inventory-runbook.md)
  利用者 ID、権限、所属、端末割当の定期棚卸。
- [lost-device-runbook.md](/C:/practice/medical-support-apps/docs/operations/lost-device-runbook.md)
  紛失端末発生時の停止、切り離し、再開の流れ。
- [monitoring-alerting-runbook.md](/C:/practice/medical-support-apps/docs/operations/monitoring-alerting-runbook.md)
  外部 uptime、DB、backup job、security signal の監視条件と通知先。
- [network-security-runbook.md](/C:/practice/medical-support-apps/docs/operations/network-security-runbook.md)
  `EMS / HOSPITAL / ADMIN` の接続元、禁止事項、障害時切替、責任分界。
- [operations-account-lifecycle.md](/C:/practice/medical-support-apps/docs/operations/operations-account-lifecycle.md)
  アカウント発行、異動、退職、権限変更の標準フロー。
- [asset-education-runbook.md](/C:/practice/medical-support-apps/docs/operations/asset-education-runbook.md)
  端末資産管理、再配布、教育 / 訓練記録の残し方。
- [performance-index-runbook.md](/C:/practice/medical-support-apps/docs/operations/performance-index-runbook.md)
  1000件以上 dataset、代表 query timing、index 確認手順。
- [release-runbook.md](/C:/practice/medical-support-apps/docs/operations/release-runbook.md)
  リリース前後の確認、ロールバック判断、確認対象導線。
- [secret-rotation-runbook.md](/C:/practice/medical-support-apps/docs/operations/secret-rotation-runbook.md)
  `AUTH_SECRET`、DB credential、backup report token の更新手順。
- [support-contact-guide.md](/C:/practice/medical-support-apps/docs/operations/support-contact-guide.md)
  現場からの問い合わせ受付テンプレートと連絡経路。
- [training-demo-runbook.md](/C:/practice/medical-support-apps/docs/operations/training-demo-runbook.md)
  `TRAINING` モードを使った説明会、訓練、デモの標準運用。
- [vulnerability-response-runbook.md](/C:/practice/medical-support-apps/docs/operations/vulnerability-response-runbook.md)
  依存脆弱性、緊急パッチ、`npm audit`、Dependabot PR の対応手順。

## 記録テンプレート

- [medical-safety-record-templates.md](/C:/practice/medical-support-apps/docs/reference/medical-safety-record-templates.md)
  棚卸、監査、restore drill、資産、教育の最小テンプレート。

## 併せて参照する文書

- 全体の再開点: [current-work.md](/C:/practice/medical-support-apps/docs/current-work.md)
- 仕様の正本: [system-spec-2026-03-29.md](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md)
- セキュリティ説明: [security-overview.md](/C:/practice/medical-support-apps/docs/policies/security-overview.md)
- 認証 / 認可方針: [auth-authorization-policy.md](/C:/practice/medical-support-apps/docs/policies/auth-authorization-policy.md)
- データ保持: [data-retention-policy.md](/C:/practice/medical-support-apps/docs/policies/data-retention-policy.md)
