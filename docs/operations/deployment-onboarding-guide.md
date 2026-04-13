# 導入手順書

## 目的

- 新しい病院、救急隊、管理者をこのシステムへ乗せるときの標準手順を固定する。
- アカウント発行、端末配布、初回ログイン、TRAINING 説明までを 1 本の流れとして扱う。

## このプロジェクトの導入対象

- `EMS`
  - 主に iPad や現場用タブレット
- `HOSPITAL`
  - 主に院内 PC
- `DISPATCH`
  - 指令台や本部端末
- `ADMIN`
  - 運用管理者端末

## 導入前に整理しておく情報

- 病院一覧と診療科の正本
- 救急隊一覧と表示名
- 利用開始日
- ロールごとの利用人数
- 端末台数と端末名
- TRAINING 実施予定の有無
- 問い合わせ窓口

## 本番基盤の事前確認

- production PostgreSQL の storage encryption が有効である
- backup store の暗号化が有効である
- DB dump の保存先、アクセス権限、保持期間が決まっている
- production DB dump を local / staging に直接復元しない運用になっている
- `DATABASE_URL`、`AUTH_SECRET`、`BACKUP_REPORT_TOKEN` は production 専用値で、他環境と共有していない
- `/api/health` と `ADMIN / 監視` が production で確認できる

## 導入の全体フロー

1. 組織情報を登録する
2. 必要なユーザーを作成する
3. ロールと所属を確認する
4. 一時パスワードを発行する
5. `EMS / HOSPITAL` 用端末に登録コードを発行する
6. 初回ログイン、WebAuthn MFA 登録、端末登録を行う
7. 必要なら TRAINING モードで説明会を実施する
8. 本番利用開始後、`ADMIN / 監視` で初日確認を行う

## 1. 組織登録

### 病院

- 病院名
- sourceNo
- 表示順
- 有効状態
- 利用する診療科

### 救急隊

- 隊名
- sourceNo
- 有効状態
- 表示名

### 確認ポイント

- EMS から検索対象に出る病院名が正しいか
- HOSPITAL ログイン後に自院案件だけが見える前提になっているか
- DISPATCH 用の導線で対象組織が揃っているか

## 2. ユーザー作成

作成時に最低限決めるもの:

- 表示名
- ロール
- 所属組織
- 有効状態
- 初回利用日
- 配布端末

補足:

- `EMS / HOSPITAL` は端末登録運用を前提にする
- `ADMIN` は運用用であり、現場端末と混ぜない
- `DISPATCH` は現行方針では MFA 対象外とし、導入時は通常ログイン導線のみ確認する

## 3. 配布情報の準備

### 利用者へ渡すもの

- ログイン ID
- 一時パスワード
- 端末登録コード
  - `EMS / HOSPITAL` のみ
- 利用開始日時
- 問い合わせ先

### 利用者へ説明すること

- 一時パスワードは 24 時間以内
- 初回ログイン後に新しいパスワードへ変更が必要
- `HOSPITAL` は WebAuthn MFA を登録する。`EMS` は現行方針では端末登録のみ必須
- 登録コードは初回の端末登録時だけ使う
- 5 時間経過すると完全再ログインが必要
- 現段階では PIN 再入場はログイン導線に組み込まない

## 4. 初回セットアップ確認

### EMS 端末

1. iPad でログインする
2. 一時パスワードで入る
3. パスワード変更を完了する
4. WebAuthn MFA を登録する
5. 端末登録コードを入力する
6. `EMS ホーム`、事案作成、病院検索を確認する

### HOSPITAL 端末

1. PC でログインする
2. 一時パスワードで入る
3. パスワード変更を完了する
4. WebAuthn MFA を登録する
5. 端末登録コードを入力する
6. `受入要請一覧`、`患者一覧`、`設定` を確認する

### ADMIN 端末

1. ログインする
2. `ユーザー管理`、`端末管理`、`監視` を確認する
3. ロック解除、一時パスワード発行、登録コード発行の場所を把握する

## 5. TRAINING 説明を併用する場合

1. 対象ユーザーを `TRAINING` に切り替える
2. 実データと混ざらないことを説明する
3. 受入要請、相談、搬送判断までを 1 回通す
4. 終了後に `LIVE` へ戻す

## 導入初日の確認

- ログインできる
- 端末登録できる
- WebAuthn MFA 登録ができる
- EMS で病院検索が動く
- HOSPITAL で受入要請一覧が開く
- ADMIN で監視画面が開く
- 問い合わせ先が共有されている

## 関連文書

- [operations-account-lifecycle.md](/C:/practice/medical-support-apps/docs/operations/operations-account-lifecycle.md)
- [device-registration-guide.md](/C:/practice/medical-support-apps/docs/operations/device-registration-guide.md)
- [training-demo-runbook.md](/C:/practice/medical-support-apps/docs/operations/training-demo-runbook.md)
- [admin-operations-guide.md](/C:/practice/medical-support-apps/docs/operations/admin-operations-guide.md)
