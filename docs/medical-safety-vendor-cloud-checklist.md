# 医療情報安全管理 委託 / クラウド確認 checklist

更新日: 2026-04-14

## 目的

委託先、クラウド、再委託先を含む外部事業者に対し、契約前 / 契約中 / 障害時に最低限確認すべき事項を固定する。

## 対象

- hosting
- managed PostgreSQL
- backup store
- 外部監視
- 通知連携
- 将来の外部 API / 地域連携サービス

## 契約前チェック

| 確認項目 | 内容 | 判定 |
|---|---|---|
| ガイドライン理解 | `医療情報システム安全管理ガイドライン` と事業者向けガイドラインの理解を確認する | 未 / 済 |
| 認証 / 認可 | 管理者アクセス、運用者アクセス、特権 ID 管理の方式を確認する | 未 / 済 |
| ログ提供 | 障害時、監査時に必要なログを提供できるか確認する | 未 / 済 |
| backup | 世代数、方式、暗号化、保管場所、追記不能設定、restore 支援可否を確認する | 未 / 済 |
| 障害報告 | 連絡窓口、初報 SLA、原因報告、再発防止報告の有無を確認する | 未 / 済 |
| セキュリティ認証 | ISO 27001、JIS Q 27001、JIS Q 15001、ISMAP などの有無を確認する | 未 / 済 |
| 再委託 | 再委託の有無、範囲、事前承認要否、国外移転有無を確認する | 未 / 済 |
| データ所在 | 保存国 / リージョン、backup 保存先、障害時の切替先を確認する | 未 / 済 |
| 契約終了時 | データ返却、削除証明、アカウント停止、ログ保全期間を確認する | 未 / 済 |
| 監査協力 | 医療機関側の監査、証跡確認、質問票への回答可否を確認する | 未 / 済 |

## 契約書 / SLA に入れる項目

- 役割分担と責任分界
- 障害時の初報時間、復旧目標、連絡経路
- 情報漏えい、サイバー事故、設定ミス時の報告義務
- 再委託時の事前承認
- ログ、証跡、設定情報の提供義務
- backup / restore 支援範囲
- 契約終了時のデータ返却、削除、証明

## 定期確認

| 頻度 | 確認内容 |
|---|---|
| 月次 | 障害、backup failure、security incident の有無 |
| 四半期 | 契約範囲、連絡先、再委託、データ所在の変化 |
| 年次 | 認証取得状況、脆弱性対応、監査協力、SLA 見直し |

## 障害 / 事故時チェック

| 確認項目 | 内容 |
|---|---|
| 初報 | いつ、誰が、何を把握しているか |
| 影響範囲 | 患者情報、認証、通知、backup、監査ログに影響があるか |
| 証跡保全 | ログ、設定差分、backup 結果を保全できるか |
| 再委託先影響 | 外部事業者のさらに先の障害か |
| 復旧支援 | restore、切替、暫定運用の支援があるか |
| 報告書 | 原因、再発防止、恒久対策の報告を得られるか |

## このプロジェクトで追加確認が必要な点

- `backup run report` はあるが、実 backup 方式の複線化確認がまだない
- managed PostgreSQL の backup / PITR / encryption / operator access の確認が未完了
- 監視 SaaS や通知経路の製品選定前提が多く、正式な委託先台帳がない
- 将来の地域連携 / 外部 API 連携時の第三者提供責任分界が未整理

## 関連文書

- [medical-safety-responsibility-matrix.md](/C:/practice/medical-support-apps/docs/medical-safety-responsibility-matrix.md)
- [infrastructure-overview.md](/C:/practice/medical-support-apps/docs/policies/infrastructure-overview.md)
- [monitoring-alerting-runbook.md](/C:/practice/medical-support-apps/docs/operations/monitoring-alerting-runbook.md)
