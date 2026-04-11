# 認証 / 認可方針書

## 目的

- ロール、権限、認証手段、失効条件を一枚で説明できるようにする。

## 認証

- 現在の基本ログイン:
  - `username + password`
- 追加保護:
  - ログイン失敗回数制限
  - 一時ロック
  - 一時パスワード
  - 強制パスワード変更
  - 端末登録コード
  - WebAuthn MFA

## セッション

- EMS / HOSPITAL はログアウト後ログインで WebAuthn MFA を必須とする
- 5時間で完全再ログイン
- アカウント停止やパスワード変更時は既存セッション失効
- PIN 再開、PIN API、PIN overlay は現行仕様では使わない

## 認可

### EMS

- 自隊の事案と target に限定

### HOSPITAL

- 自院宛の要請、相談、患者に限定

### ADMIN

- 管理画面全体にアクセス可能

### DISPATCH

- 指令系画面にアクセス可能

## 失効条件

- アカウント停止
- セッション version 不一致
- 一時パスワード変更完了
- 端末紛失時停止

## 関連実装

- [auth.config.ts](/C:/practice/medical-support-apps/auth.config.ts)
- [proxy.ts](/C:/practice/medical-support-apps/proxy.ts)
- [authContext.ts](/C:/practice/medical-support-apps/lib/authContext.ts)
- [securityAuthRepository.ts](/C:/practice/medical-support-apps/lib/securityAuthRepository.ts)
