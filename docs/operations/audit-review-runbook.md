# 監査 / 点検 Runbook

## 目的

- 監査ログ、監視イベント、運用 runbook の実施状況を定期的に確認し、不正利用や運用逸脱を見逃さない。
- `誰が / 何を / どの頻度で / どう是正するか` を固定する。

## 実施頻度

- 日次:
  監視画面の確認
- 週次:
  監査ログ / security signal のレビュー
- 月次:
  backup、ID 棚卸、端末、教育、障害記録の総点検
- 半期:
  監査観点の見直し

## 日次点検

1. `ADMIN / 監視` を開く
2. `DB 接続`、`API 失敗`、`notification failure`、`security signal`、`backup result` を確認する
3. 異常があれば incident runbook へ移る
4. 日次点検記録に `正常 / 要対応` を残す

## 週次レビュー

1. 監査ログで高リスク操作を確認する
2. security signal の増加傾向を確認する
3. ロック中アカウント、一時パスワード発行、端末再登録の件数を確認する
4. 権限逸脱、失敗急増、同一 source 多発がないかを見る
5. 必要なら所属責任者へ照会する

## 月次総点検

1. `ID 棚卸` の実施結果を確認する
2. backup 実施と restore drill 実施有無を確認する
3. 端末紛失、障害、問い合わせの件数を確認する
4. ルール逸脱の再発有無を確認する
5. 是正項目を `即対応 / 次月対応 / 許容` に分類する

## 高リスク操作の例

- ユーザー停止 / 再開
- 一時パスワード発行
- ロール変更
- 端末登録コード発行
- 端末再登録
- 大量送信、大量 status update
- 権限逸脱試行

## 記録に残すこと

- 実施日
- 実施者
- 参照したログ / 画面
- 異常有無
- 是正内容
- フォロー期限

## 監査記録の最小様式

| 日付 | 区分 | 確認対象 | 結果 | 是正内容 | 実施者 |
|---|---|---|---|---|---|
| 2026-04-30 | 週次 | security signal | 権限逸脱 2 件 | 所属責任者へ照会 | admin-a |

## 是正判断の目安

- 即時是正:
  権限逸脱、不要 ADMIN、backup failure 放置、重大障害未記録
- 当日中:
  通知 failure 継続、MFA / 端末登録失敗の多発、非アクティブ ID 放置
- 定例で改善:
  記録漏れ、教育実施漏れ、手順未更新

## 関連文書

- [monitoring-alerting-runbook.md](/C:/practice/medical-support-apps/docs/operations/monitoring-alerting-runbook.md)
- [incident-response-runbook.md](/C:/practice/medical-support-apps/docs/operations/incident-response-runbook.md)
- [id-inventory-runbook.md](/C:/practice/medical-support-apps/docs/operations/id-inventory-runbook.md)
- [medical-safety-evidence-matrix.md](/C:/practice/medical-support-apps/docs/medical-safety-evidence-matrix.md)
