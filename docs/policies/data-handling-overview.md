# データ取扱い説明

## 目的

- 患者情報、相談データ、通知、監査データをどう扱うかを説明する。

## 扱う主なデータ

### 1. 患者情報 / 事案情報

- 氏名
- 年齢
- 性別
- 主訴
- バイタル
- 所見
- 現場住所

### 2. 相談 / 受入要請データ

- 送信先病院
- 要請内容
- 相談コメント
- 応答状態
- 搬送判断

### 3. 通知データ

- 未読 / 既読
- 通知種別
- 対象案件
- 対象ロール

### 4. 認証 / 監査 / 監視データ

- ログイン試行
- 一時パスワード運用情報
- 端末登録情報
- 監査ログ
- 監視イベント

## 基本原則

- ロールに必要な範囲だけを表示する
- `EMS` は自隊、`HOSPITAL` は自院、`ADMIN` は管理範囲で扱う
- 患者情報と運用ログを同じ目的で混在させない
- 通知は本文だけでなく scope 情報を持って扱う

## ローカル端末での扱い

- 端末登録を前提に利用する
- `EMS / HOSPITAL` は WebAuthn MFA 登録済み端末で利用する
- セッション期限後は 5 時間で完全再ログインを求める
- 現段階では PIN 再入場はログイン導線に組み込まない
- 端末紛失時はアカウント停止を優先する
- 遠隔ワイプは初期実装対象外

## 保持 / 削除

- 詳細な保持方針は [data-retention-policy.md](/C:/practice/medical-support-apps/docs/policies/data-retention-policy.md) を参照する
- バックアップと復旧は [backup-restore-runbook.md](/C:/practice/medical-support-apps/docs/operations/backup-restore-runbook.md) を参照する

## 関連文書

- [security-overview.md](/C:/practice/medical-support-apps/docs/policies/security-overview.md)
- [auth-authorization-policy.md](/C:/practice/medical-support-apps/docs/policies/auth-authorization-policy.md)
