# PoC 説明資料

## 目的

- MVP / PoC 提案時に、このプロジェクトで今どこまで実現できているかを短時間で説明する。
- 単なる画面一覧ではなく、「現場導線」「管理導線」「運用保全」の 3 本柱で伝える。

## このプロジェクトが扱う業務

- `EMS`
  - 事案作成
  - 患者情報入力
  - 病院検索
  - 受入要請送信
  - 相談確認
  - 搬送決定 / 辞退
- `HOSPITAL`
  - 受入要請一覧
  - 詳細確認
  - 相談返信
  - 受入可能 / 不可 / 要相談
  - 搬送決定患者、辞退患者の確認
- `DISPATCH`
  - 指令側起票と事案管理
- `ADMIN`
  - 監視
  - ユーザー / 端末 / 組織管理
  - TRAINING 運用

## 現在の PoC で見せられること

### 1. ロール別業務導線

- `EMS -> HOSPITAL` の受入要請フロー
- `HOSPITAL -> EMS` の相談 / 回答フロー
- `EMS` の搬送判断フロー
- `ADMIN` の監視と運用管理

### 2. 業務データのつながり

- 事案
- 患者サマリー
- 病院検索結果
- 受入要請
- 相談コメント
- 搬送判断
- 通知

この一連が画面横断でつながっていることを見せられる。

### 3. 運用保全

- ログイン失敗回数制限
- 一時パスワード発行
- 強制パスワード変更
- `EMS / HOSPITAL` の端末登録
- 端末別 PIN 再開
- `ADMIN / 監視`
- backup run 記録口
- TRAINING データ分離

### 4. 大量データ / 回帰確認の土台

- 100 件 bulk dataset 生成
- role 別 Playwright 回帰
- focused E2E による主要導線確認
- `agent-browser` を使った画面確認運用

## PoC の見せ方

### パターン A: 現場フロー重視

1. `EMS` で事案を作る
2. 患者情報とバイタルを入れる
3. 病院検索を行う
4. `HOSPITAL` へ送信する
5. `HOSPITAL` 側で回答する
6. `EMS` で搬送判断する

### パターン B: 管理と安全性も見せる

1. 上記の現場フロー
2. `ADMIN / 監視` を開く
3. 端末登録や一時パスワードの説明をする
4. `TRAINING` モードで実運用と分離できることを見せる

## 現時点の到達点

- 業務導線の主要フローは PoC として見せられる
- ロール分離は画面 / API の両面で整理が進んでいる
- オフライン競合は初期対応方針まで整理済み
- セキュリティ hardening は基盤導入済み
  - ただし MFA の追加要素有効化は保留
- 監視と backup runbook は整備済み

## まだ次段階の項目

- MFA の追加要素有効化
- 端末 fingerprint / 登録情報の強化
- backup 結果の自動ジョブ連携
- 監視の外部通知接続
- 運用実績に基づく runbook 改訂

## 導入先へ説明するときの要点

- `EMS` と `HOSPITAL` の往復が 1 つの案件として追える
- TRAINING と LIVE を混ぜない
- 運用管理者が監視と統制を持てる
- 段階的に hardening を進められる設計になっている

## 併せて参照する文書

- [security-overview.md](/C:/practice/medical-support-apps/docs/policies/security-overview.md)
- [auth-authorization-policy.md](/C:/practice/medical-support-apps/docs/policies/auth-authorization-policy.md)
- [infrastructure-overview.md](/C:/practice/medical-support-apps/docs/policies/infrastructure-overview.md)
- [training-demo-runbook.md](/C:/practice/medical-support-apps/docs/operations/training-demo-runbook.md)
