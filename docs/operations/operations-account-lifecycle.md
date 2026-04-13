# アカウント運用フロー

## 目的

- アカウント発行、異動、退職、停止、再開、権限変更を、誰がどの順で進めるかを固定する。
- このプロジェクトのロール分離と端末登録前提を運用へ落とし込む。

## 対象ロール

- `ADMIN`
- `EMS`
- `HOSPITAL`
- `DISPATCH`

## 現在の実装前提

- `next-auth Credentials + JWT session`
- ログイン失敗回数制限とロック
- 一時パスワード発行
- 一時パスワード後の強制変更
- `EMS / HOSPITAL` の端末登録コード運用
- `HOSPITAL` の WebAuthn MFA 必須化。`EMS` は現行方針では MFA 対象外
- 5時間後の完全再ログイン
- 現段階では PIN 再入場はログイン導線に組み込まない

## 1. アカウント発行フロー

### 役割

- 申請者
  - 所属責任者または導入担当
- 承認者
  - 運用責任者
- 発行者
  - `ADMIN`

### 流れ

1. 所属責任者が新規利用者を申請する
2. 運用責任者がロール、所属、利用開始日を確認して承認する
3. `ADMIN` がユーザーを作成する
4. `ADMIN` が一時パスワードを発行する
5. `EMS / HOSPITAL` には必要に応じて端末登録コードも発行する
6. 利用者は初回ログイン後にパスワード変更、WebAuthn MFA、端末登録を行う

### 発行時に決めるもの

- ロール
- 所属救急隊または所属病院
- 表示名
- 利用開始日
- 利用端末
- 問い合わせ先

## 2. 異動時フロー

1. 所属責任者が異動を申請する
2. 運用責任者が新所属と切替日を承認する
3. `ADMIN` が旧所属との整合を確認する
4. `ADMIN` がロールまたは所属を変更する
5. 必要なら旧端末を失効扱いとし、新端末用登録コードを発行する
6. 変更後にログイン、表示範囲、通知対象を spot check する

## 3. 退職 / 利用終了時フロー

1. 所属責任者が停止依頼を出す
2. `ADMIN` がアカウントを無効化する
3. 既存セッションを失効させる
4. 配布端末が残っている場合は回収または紛失扱いを決める
5. 引継ぎが必要なら後任アカウントへ配布情報を切り替える

## 4. 一時停止フロー

利用停止が一時的なケース:

- 端末紛失
- 長期離脱
- 不審ログイン

手順:

1. 停止理由を記録する
2. `ADMIN` がアカウントを停止する
3. 必要なら一時パスワードを失効前提で再発行する
4. 再開条件を明記して共有する

## 5. 権限変更時フロー

1. 変更理由を申請に残す
2. `ADMIN` が対象ユーザーを開く
3. ロールと所属を変更する
4. 必要に応じてセッション失効を行う
5. 監査ログや運用記録に残す

## 6. 日常棚卸し

### 週次

- ロック中アカウント確認
- 一時パスワード発行履歴確認
- 端末登録待ちユーザー確認

### 月次

- 非アクティブユーザー棚卸し
- 所属とロールの整合確認
- 端末一覧との突合
- TRAINING 利用アカウント確認

## 7. 運用上の注意

- `EMS` と `HOSPITAL` は端末登録前提で配布する
- 一時パスワードだけを渡して終わらせない
- 紛失時は「端末だけ止める」より「アカウント停止」を優先する
- 異動時は旧所属の見える範囲を残さない

## 関連文書

- [device-registration-guide.md](/C:/practice/medical-support-apps/docs/operations/device-registration-guide.md)
- [lost-device-runbook.md](/C:/practice/medical-support-apps/docs/operations/lost-device-runbook.md)
- [admin-operations-guide.md](/C:/practice/medical-support-apps/docs/operations/admin-operations-guide.md)
- [deployment-onboarding-guide.md](/C:/practice/medical-support-apps/docs/operations/deployment-onboarding-guide.md)
