# リリース手順

## 目的

- デプロイ、影響確認、ロールバック判断を標準化し、現場導線に影響する変更を安全に出す。

## このプロジェクトで特に壊してはいけない導線

- `/login`
- `EMS` の事案作成、病院検索、送信
- `HOSPITAL` の受入要請一覧、相談、患者一覧
- `ADMIN / 監視`
- `TRAINING` 切替

## リリース前確認

1. 変更範囲を整理する
2. 影響する docs / plan を更新する
3. 少なくとも `npm run typecheck` を通す
4. 影響のある focused E2E を通す
5. データ変更や運用影響があれば runbook を確認する

推奨確認の例:

- 認証まわり: `security-hardening` 系
- 端末登録まわり: `device-registration` 系
- role shell 影響: `role-shells`
- 監視 / rate limit 影響: `security-ops-monitoring`

## リリース実施

1. デプロイ対象コミットを確定する
2. リリース時刻を共有する
3. デプロイを実行する
4. 完了後すぐに代表導線の疎通確認へ入る

## リリース直後の確認

### 最低限の疎通

- `/login` が開く
- `ADMIN / 監視` が開く
- `EMS ホーム` が開く
- `HOSPITAL 受入要請一覧` が開く

### 操作確認

- ログインできる
- 通知一覧取得できる
- 主要 API が 500 を連発していない
- 監視画面で異常が増えていない

### ドキュメント影響

- 新しい運用が入った場合、関連 runbook が最新になっている

## ロールバック条件

- `/login` が継続的に失敗する
- `EMS` から要請送信できない
- `HOSPITAL` で受入要請一覧が開かない
- 相談送受信が壊れている
- `ADMIN / 監視` で重大異常が継続している

## ロールバック手順

1. 直前の安定版を確定する
2. その版へ戻す
3. 再度、代表導線を確認する
4. 必要なら利用者へ障害連絡を行う
5. 原因整理と再発防止を記録する

## リリース後に残す記録

- リリース日時
- 対象コミット
- 実施者
- 疎通確認結果
- 問題発生有無
- ロールバック有無

## 関連文書

- [incident-response-runbook.md](/C:/practice/medical-support-apps/docs/operations/incident-response-runbook.md)
- [admin-operations-guide.md](/C:/practice/medical-support-apps/docs/operations/admin-operations-guide.md)
- [current-work.md](/C:/practice/medical-support-apps/docs/current-work.md)
