# ID 棚卸 Runbook

## 目的

- 利用者 ID、ロール、所属、端末割当の棚卸を定期的に行い、不要 ID や過大権限を残さない。
- ガイドライン準拠で求められる `ID の定期棚卸` と `本人確認証跡` を運用へ落とす。

## 対象

- `ADMIN`
- `EMS`
- `HOSPITAL`
- `DISPATCH`

## 実施頻度

- 月次:
  全利用者の棚卸
- 臨時:
  異動、退職、紛失、不審ログイン、委託終了の発生時

## 実施責任

- 実施責任者:
  システム運用担当者
- 確認責任者:
  企画管理者
- 承認者:
  医療機関等の管理責任者または運用責任者

## 事前に集めるもの

- 現在の利用者一覧
- 所属責任者からの在籍 / 異動情報
- 端末登録状況
- ロック中アカウント、一時パスワード発行履歴、非アクティブ一覧

## 月次手順

1. 全利用者一覧を取得する
2. ロール、所属、表示名、利用開始日、最終利用状況を確認する
3. 所属責任者へ在籍確認を依頼する
4. 不要 ID、休職者、異動済み、重複 ID、過大権限候補を抽出する
5. `EMS / HOSPITAL` は端末割当と登録状況を突合する
6. 対応要否を `停止 / 変更 / 維持` で分類する
7. 承認後に `ADMIN` が停止、権限変更、端末再登録を実施する
8. 実施結果を棚卸記録へ残す

## 本人確認が必要な場面

- 一時パスワード再発行
- ロック解除
- MFA 再登録
- 端末紛失後の再開
- ロール昇格

## 本人確認記録に残すこと

- 実施日
- 対象ユーザー
- 実施者
- 確認方法
- 確認結果
- 実施した変更

## 棚卸記録の最小様式

| 日付 | 対象ユーザー | ロール | 所属 | 判定 | 対応内容 | 実施者 | 承認者 |
|---|---|---|---|---|---|---|---|
| 2026-04-30 | sample-user | EMS | TEAM-A | 停止 | 非在籍のため停止 | admin-a | ops-manager |

## 重点確認

- `ADMIN` の不要 ID
- `HOSPITAL` の MFA 未登録アカウント
- `EMS / HOSPITAL` の端末登録待ち放置
- 長期間未使用アカウント
- 異動済みなのに旧所属が残るアカウント

## 逸脱時の対応

- 即時停止が必要:
  退職済み、紛失端末利用、不審ログイン、説明不能な権限昇格
- 当日中対応:
  異動未反映、端末不一致、MFA 未登録放置
- 次回棚卸まで許容:
  表示名ゆれなど患者情報保護に直接影響しないもの

## 関連文書

- [operations-account-lifecycle.md](/C:/practice/medical-support-apps/docs/operations/operations-account-lifecycle.md)
- [device-registration-guide.md](/C:/practice/medical-support-apps/docs/operations/device-registration-guide.md)
- [lost-device-runbook.md](/C:/practice/medical-support-apps/docs/operations/lost-device-runbook.md)
- [medical-safety-evidence-matrix.md](/C:/practice/medical-support-apps/docs/medical-safety-evidence-matrix.md)
