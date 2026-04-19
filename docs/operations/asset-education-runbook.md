# 資産管理 / 教育 Runbook

## 目的

- `EMS iPad`、`HOSPITAL PC`、`ADMIN` 端末などの資産管理と、利用者教育 / 訓練の最小運用を固定する。
- 端末登録だけで終わらず、棚卸、再配布、廃棄、教育記録まで一貫して残す。

## 対象資産

- `EMS` 用 iPad / タブレット
- `HOSPITAL` 用 PC
- `ADMIN` 用管理端末
- 予備端末

## 資産台帳に残すこと

- 端末名
- 利用部門
- 利用者または共用区分
- 登録日
- 最終確認日
- 紛失 / 故障 / 廃棄状態
- 備考

## 月次資産確認

1. 利用中端末一覧を確認する
2. 実在確認、利用部門、登録状態を突合する
3. 紛失、未使用、故障、用途不明の端末を抽出する
4. 必要なら停止、再登録、回収を行う
5. 資産台帳へ反映する

## 廃棄 / 再配布時の確認

- アカウント停止または利用者変更を先に行う
- 端末登録状態を見直す
- ローカル保存残留の可能性を確認する
- 廃棄 / 再配布記録を残す

## 教育対象

- `ADMIN`
- `EMS`
- `HOSPITAL`
- `DISPATCH`
- 保守担当

## 最低限の教育項目

- ログイン、MFA、端末登録
- 紛失時連絡
- 通知停止時の暫定運用
- オフライン競合時の判断
- 一時パスワードと本人確認の扱い
- 患者情報を外部へ持ち出さない原則

## 教育実施記録

| 日付 | 対象 | 内容 | 実施者 | 結果 |
|---|---|---|---|---|
| 2026-05-15 | EMS 新任 | 端末登録 / 紛失時対応 | admin-a | 受講済 |

## 年次または半期の訓練候補

- 端末紛失時の初動
- ログイン障害時の切り分け
- backup failure 時の連絡
- restore drill の読み合わせ
- 不審操作検知時のエスカレーション

## 関連文書

- [lost-device-runbook.md](/C:/practice/medical-support-apps/docs/operations/lost-device-runbook.md)
- [device-registration-guide.md](/C:/practice/medical-support-apps/docs/operations/device-registration-guide.md)
- [id-inventory-runbook.md](/C:/practice/medical-support-apps/docs/operations/id-inventory-runbook.md)
- [medical-safety-evidence-matrix.md](/C:/practice/medical-support-apps/docs/medical-safety-evidence-matrix.md)
