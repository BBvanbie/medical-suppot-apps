# 医療情報安全管理 リスクアセスメント台帳

更新日: 2026-04-14

## 目的

現行システムで扱う主要な情報資産、保存場所、脅威、既存対策、残リスクを 1 枚で確認できるようにする。

## 判定ルール

- 重要度:
  `高 / 中 / 低`
- 残リスク:
  `高 / 中 / 低`
- 対応方針:
  `すぐ対応 / 計画対応 / 現状許容`

## 台帳

| 情報資産 / 機能 | 主な保存場所 | 重要度 | 主な脅威 | 既存対策 | 残リスク | 対応方針 | 次アクション |
|---|---|---|---|---|---|---|---|
| 事案、患者要約、搬送判断 | PostgreSQL | 高 | 不正閲覧、誤更新、漏えい、削除 | role / scope 認可、監査ログ、session 失効 | 中 | 計画対応 | 真正性 / 更新履歴 / 正式記録範囲を別設計で固定 |
| 相談コメント、受入要請履歴 | PostgreSQL | 高 | 漏えい、誤送信、改ざん | role 制御、監査ログ、monitoring | 中 | 計画対応 | 外部共有 / 第三者提供整理を追加 |
| 通知 | PostgreSQL | 中 | 誤配信、過剰通知、漏えい | 通知失敗監視、role 制御 | 中 | 計画対応 | 通知先整理、障害時の手動代替を文書化 |
| 監査ログ | PostgreSQL | 高 | 改ざん、欠落、過剰閲覧 | `audit_logs`、ADMIN 限定閲覧 | 中 | 計画対応 | 定期レビュー頻度、保持期間、保全手順を追加 |
| 監視イベント | PostgreSQL | 中 | 検知漏れ、しきい値不備 | `system_monitor_events`、ADMIN 監視 | 中 | 計画対応 | 外部通知、保管期間、レビュー手順を追加 |
| login 試行、lockout | PostgreSQL | 高 | なりすまし、総当たり | 5回 / 5分 lockout、security signal | 低 | 現状許容 | MFA / step-up の適用範囲を継続判断 |
| WebAuthn credential | PostgreSQL | 高 | 不正登録、不正利用 | HOSPITAL MFA、credential 分離保存 | 中 | 計画対応 | 再登録、失効、非常時代替手順を強化 |
| 端末登録情報 | PostgreSQL | 高 | 紛失端末継続利用、なりすまし | device registration、hash 化、失効運用 | 中 | 計画対応 | 端末資産台帳と棚卸を追加 |
| オフライン下書き / queue | IndexedDB | 高 | 端末紛失、残留、漏えい | AES-GCM、TTL、logout 削除 | 中 | 計画対応 | 自動削除契機、資産管理、訓練を追加 |
| hospitalCache / searchState | IndexedDB | 中 | 情報残留、端末共有 | TTL、logout 削除、部分暗号化 | 中 | 計画対応 | 暗号化範囲と端末運用を再評価 |
| backup データ | encrypted backup store | 高 | ランサム、復旧不能、漏えい | 暗号化、runbook、job report | 高 | すぐ対応 | 複数世代、複数方式、追記不能保管、restore drill を定義 |
| アプリ / DB / 監視基盤 | hosting / DB / monitor | 高 | 障害、設定ミス、脆弱性、供給停止 | `/api/health`、runbook、audit、Dependabot | 中 | 計画対応 | 責任分界、委託管理、ネットワーク運用を追加 |
| ユーザー ID / 権限 | DB、運用手順 | 高 | 不要 ID 残存、権限過大 | account lifecycle、role guard | 中 | すぐ対応 | 定期棚卸と本人確認証跡を追加 |
| 運用文書 / 連絡先 | docs、運用保管先 | 中 | 未更新、参照不一致 | repo docs 更新 | 中 | 計画対応 | 実運用側の正本保管場所を決める |

## 重点ギャップ

- `高` かつ `すぐ対応`:
  backup データ、ユーザー ID / 権限
- `高` かつ `計画対応`:
  正式記録の真正性 / 保存性、端末資産管理、委託 / クラウド責任分界
- `中` だが波及が大きい:
  通知、監査ログレビュー、オフライン保存運用

## 次にやること

1. 本台帳に owner と見直し周期を追加する
2. backup と ID 棚卸を先に runbook 化する
3. 正式記録の範囲が決まったら真正性 / 保存性の評価列を追加する

## 関連文書

- [medical-safety-responsibility-matrix.md](/C:/practice/medical-support-apps/docs/medical-safety-responsibility-matrix.md)
- [offline-data-protection-policy.md](/C:/practice/medical-support-apps/docs/policies/offline-data-protection-policy.md)
- [backup-restore-runbook.md](/C:/practice/medical-support-apps/docs/operations/backup-restore-runbook.md)
