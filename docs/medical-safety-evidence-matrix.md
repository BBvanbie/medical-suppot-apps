# 医療情報安全管理 規程 / 証跡一覧

更新日: 2026-04-19

## 目的

ガイドライン準拠で必要になる `規程`、`手順`、`記録`、`証跡` を、この repo の現行 docs と不足項目にひも付けて整理する。

## 一覧

| 項目 | 現在の正本 / 参照先 | 現状 | 不足 | 次アクション |
|---|---|---|---|---|
| 認証 / 認可方針 | `docs/auth_requirements_definition.md`、`docs/policies/auth-authorization-policy.md` | あり | 本人確認台帳の運用定着が必要 | `docs/operations/id-inventory-runbook.md` を運用する |
| セキュリティ方針概要 | `docs/policies/security-overview.md` | あり | ガイドライン準拠の上位文書としては薄い | 将来 policy を再編する |
| ログ / 監視方針 | `docs/policies/security-logging-policy.md`、`docs/operations/monitoring-alerting-runbook.md` | あり | 定期レビュー記録の運用定着が必要 | `docs/operations/audit-review-runbook.md` を運用する |
| オフライン保存保護 | `docs/policies/offline-data-protection-policy.md` | あり | 端末紛失訓練記録、資産台帳との連携がない | 資産管理 runbook を追加する |
| backup / restore | `docs/operations/backup-restore-runbook.md` | あり | 複数世代 / 複数方式の運用定着が必要 | `docs/operations/bcp-restore-drill-runbook.md` を併用する |
| incident response | `docs/operations/incident-response-runbook.md`、`docs/operations/fail-safe-runbook.md` | あり | BCP、訓練記録の運用定着が必要 | `docs/operations/bcp-restore-drill-runbook.md` を運用する |
| secret / 環境分離 | `docs/operations/secret-rotation-runbook.md`、`docs/policies/environment-separation-policy.md` | あり | 権限棚卸記録がない | 運用記録様式を追加する |
| アカウント lifecycle | `docs/operations/operations-account-lifecycle.md` | あり | 記録運用の定着が必要 | `docs/operations/id-inventory-runbook.md` を運用する |
| 端末登録 / 紛失対応 | `docs/operations/device-registration-guide.md`、`docs/operations/lost-device-runbook.md` | あり | 端末台帳、廃棄 / 再配布記録の運用定着が必要 | `docs/operations/asset-education-runbook.md` を運用する |
| 監査ログ | DB `audit_logs`、ADMIN 画面 | 一部あり | エクスポート手順や定期レビュー運用が必要 | `docs/operations/audit-review-runbook.md` を運用する |
| リスク評価 | 本文書群では未整備 | 不足 | 正本がなかった | `medical-safety-risk-assessment-register.md` を追加済み |
| 責任分界 | 本文書群では未整備 | 不足 | 正本がなかった | `medical-safety-responsibility-matrix.md` を追加済み |
| 実名責任者割当 / 緊急連絡網 | `docs/reference/medical-safety-responsibility-assignment-template.md` | 様式あり | 導入組織ごとの実データ投入が必要 | 導入時に実名版を作成し月次で更新する |
| 証跡保管場所台帳 | `docs/reference/medical-safety-responsibility-assignment-template.md` の `記録保管場所` | 様式あり | 主保管場所 / 副保管場所 / 閲覧権限の固定が必要 | 導入時に保管責任者まで埋める |
| 委託 / クラウド確認 | `medical-safety-vendor-cloud-checklist.md`、`docs/operations/vendor-registry.md` | 様式あり | 実事業者ごとの確認記録投入が必要 | 導入時に台帳を埋め、四半期ごとに見直す |
| 教育 / 訓練 | 個別 runbook に散在 | 一部あり | 年次教育計画、受講記録、演習記録の運用定着が必要 | `docs/operations/asset-education-runbook.md` を運用する |
| 外部説明 / 患者向け説明 | `docs/policies/external-explanation-for-transport-coordination-system.md`、`docs/policies/external-explanation-for-transport-coordination-system-ems.md` と導入先別派生文書 | 様式あり | 導入組織ごとの窓口と説明履歴の記録が必要 | 導入時に対象別の説明版を確定し、説明日と説明先を記録する |
| 真正性 / 見読性 / 保存性 | なし | 不足 | 正式記録としてのルールがない | product scope 決定後に別計画化する |

## 優先度

- すぐ追加:
  ID 棚卸手順、監査 / 点検 runbook、restore drill 記録、委託 / クラウド確認の運用記録
- 次段で追加:
  教育 / 訓練記録、資産管理台帳、対外説明文書
- scope 確定後:
  真正性 / 見読性 / 保存性、電子署名、代行入力承認

## 運用ルール

- docs にあるだけでは証跡にならない。実施日、実施者、確認結果、是正内容を別途記録する。
- repo 内 docs は `手順の正本` とし、実運用で発生する記録は導入組織側の管理台帳やチケットへ保存する。
- 導入組織側で保存する証跡の保管場所は、`medical-safety-responsibility-assignment-template.md` の `記録保管場所` 表で固定する。
- 記録区分ごとに `主保管場所 / 副保管場所 / 閲覧権限 / 保管責任者` を必ず 1 行で対応付ける。
- ID 棚卸、本人確認、監査 / 点検、restore drill、教育、委託先資料の保管場所が別々でもよいが、監査時の参照経路は 1 枚で追えるようにする。
- テンプレートは `docs/reference/medical-safety-record-templates.md` を参照する。

## 関連文書

- [medical-safety-responsibility-matrix.md](/C:/practice/medical-support-apps/docs/medical-safety-responsibility-matrix.md)
- [medical-safety-risk-assessment-register.md](/C:/practice/medical-support-apps/docs/medical-safety-risk-assessment-register.md)
