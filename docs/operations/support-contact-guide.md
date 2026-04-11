# 問い合わせ / サポート導線

## 目的

- 現場からの問い合わせを、必要情報が揃った状態で `ADMIN` や運用担当へ渡せるようにする。
- 「とりあえず困っている」状態から、切り分けに必要な情報を最短で集める。

## 基本導線

### 通常問い合わせ

1. 利用者が所属責任者へ連絡する
2. 所属責任者が内容を整理する
3. `ADMIN` または運用担当へ渡す

### 障害問い合わせ

1. 発生時刻を確認する
2. どのロールかを確認する
3. どの画面かを確認する
4. 事案 ID、request ID、target ID があれば控える
5. 再現するかを確認する
6. 緊急性を判断する

## 問い合わせカテゴリ

- ログインできない
- 一時パスワードが使えない
- 端末登録できない
- WebAuthn MFA が通らない
- 受入要請が見えない
- 相談が送れない
- 通知が来ない
- オフライン同期が戻らない
- 端末を紛失した

## 連絡時に必ず伝えるもの

- ユーザー名
- ロール
- 所属
- 端末名
- 発生時刻
- 画面 URL または画面名
- エラーメッセージ
- 事案 ID や request ID

## あると助かる情報

- 直前に何をしていたか
- 他の人でも起きているか
- いつから起きているか
- 画面更新や再ログインで変わるか

## 緊急度の目安

- `高`
  - ログインできない
  - 受入要請送信ができない
  - 相談が送れない
  - 紛失端末
- `中`
  - 通知だけ来ない
  - 表示の一部が古い
- `低`
  - 文言や表示崩れ
  - TRAINING 用説明の補足要望

## ADMIN へ引き継ぐときのテンプレート

- 発生者:
- ロール:
- 所属:
- 端末名:
- 発生時刻:
- 画面:
- 案件識別子:
- 症状:
- 再現性:
- 緊急度:

## 関連文書

- [incident-response-runbook.md](/C:/practice/medical-support-apps/docs/operations/incident-response-runbook.md)
- [lost-device-runbook.md](/C:/practice/medical-support-apps/docs/operations/lost-device-runbook.md)
- [device-registration-guide.md](/C:/practice/medical-support-apps/docs/operations/device-registration-guide.md)
