# BCP / Restore Drill Runbook

## 目的

- 障害、サイバー攻撃、DB 障害時に、診療継続を優先しながら復旧できるようにする。
- `backup がある` だけで終わらせず、`復元できる` ことを定期的に確認する。

## 基本方針

- 目標:
  `RPO 12時間 / RTO 4時間`
- 重大障害時は、完全機能復旧より `最低限の運用継続` を先に確保する
- restore drill は月 1 回の軽量確認、四半期 1 回の実戦確認を目安とする

## 優先順位

1. 患者安全と現場連絡
2. 新規案件の受け付け継続可否
3. 既存案件の参照可否
4. 通知の代替運用
5. 完全な復元

## 想定シナリオ

- DB 障害
- アプリ障害
- backup failure の継続
- ランサム / 改ざん疑い
- 通知停止

## 軽量 restore drill

1. 直近バックアップの取得時刻を確認する
2. 対象 backup の metadata、サイズ、暗号化状態を確認する
3. restore 手順の読み合わせを行う
4. `必要なら復旧できる状態か` を点検表で確認する
5. 結果を drill 記録へ残す

## 実戦 restore drill

1. drill 実施日時と担当を決める
2. 使用する backup 世代を決める
3. 復旧対象時点と想定障害を決める
4. 手順どおり restore を実行する
5. ログイン、主要一覧、主要 API、監視画面を確認する
6. 結果と課題を記録する

## drill 記録の最小様式

| 日付 | drill 種別 | 使用 backup | 結果 | 課題 | 実施者 |
|---|---|---|---|---|---|
| 2026-05-31 | 軽量 | postgres-noon-backup | 成功 | 連絡先更新要 | admin-a |

## BCP で確認すること

- 障害時の連絡先
- ロール別の暫定運用
- 電話や手動更新などの代替手段
- 停止してよい機能と止めてはいけない機能
- 復旧完了の判断者

## 現時点で不足している項目

- 複数世代、複数方式、追記不能保管の確認記録
- ネットワーク分離保管の実施証跡
- 導入組織ごとの連絡網
- サイバー攻撃演習記録

## 関連文書

- [backup-restore-runbook.md](/C:/practice/medical-support-apps/docs/operations/backup-restore-runbook.md)
- [incident-response-runbook.md](/C:/practice/medical-support-apps/docs/operations/incident-response-runbook.md)
- [fail-safe-runbook.md](/C:/practice/medical-support-apps/docs/operations/fail-safe-runbook.md)
- [medical-safety-risk-assessment-register.md](/C:/practice/medical-support-apps/docs/medical-safety-risk-assessment-register.md)
