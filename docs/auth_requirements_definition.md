# 認証・MFA 要件定義書

## 1. 目的

救急搬送支援システムの認証、MFA、端末登録、失効条件を定義する。対象ロールは EMS / HOSPITAL / ADMIN / DISPATCH とする。

## 2. 基本方針

- 基本認証は `username + password` とする。
- EMS / HOSPITAL は WebAuthn MFA を必須とする。
- EMS / HOSPITAL は端末登録を必須とする。
- ADMIN / DISPATCH の MFA は現段階では必須化しない。
- ADMIN の高リスク操作には将来 step-up MFA を導入できるようにする。
- PIN による再開ロックは現行仕様では使わない。

## 3. 認証要素

### username + password

- 全ロールの基本ログインに使う。
- 現在の ID / password 体系を維持する。
- 一時パスワード発行後は、初回ログイン時に本人が新しい password へ変更する。

### WebAuthn MFA

- EMS / HOSPITAL で必須とする。
- iPad / PC の生体認証、端末 PIN、パスキーなど、端末が提供する WebAuthn 認証器を使う。
- 登録済み credential がない EMS / HOSPITAL は MFA setup へ誘導する。
- MFA 完了前の session は `authLevel = "password"` とし、保護画面へ進めない。

### 端末登録

- EMS / HOSPITAL の端末を admin が管理する。
- admin が登録コードを発行し、現場側が対象端末で入力する。
- 登録コードは 24 時間で失効する。
- 端末登録は WebAuthn MFA の代替ではなく、利用端末の制限として扱う。

### PIN

- 現行仕様ではログイン・再認証に使わない。
- 30分 / 60分 / 3時間の PIN 再開条件は廃止済みとする。
- 旧 DB に PIN 関連カラムが残る場合でも、アプリケーション要件には含めない。

## 4. ロール別要件

### EMS

- `username + password` でログインする。
- WebAuthn MFA を完了する。
- iPad などの EMS 端末登録を完了する。
- 自隊の事案、患者情報、搬送先調整だけ操作できる。

### HOSPITAL

- `username + password` でログインする。
- WebAuthn MFA を完了する。
- 病院 PC の端末登録を完了する。
- 自院宛の受入要請、相談、患者情報だけ操作できる。

### ADMIN

- 現時点では通常ログイン MFA を必須化しない。
- 全体管理、監視、ユーザー管理、端末管理を行える。
- 将来、ユーザー停止、端末失効、設定変更などの高リスク操作で step-up MFA を要求できるようにする。

### DISPATCH

- 現時点では MFA と端末登録を必須化しない。
- 指令・搬送調整系の操作に限定する。
- 将来 MFA を必須化できるよう、認証状態の拡張余地を維持する。

## 5. セッション要件

- セッション最大時間は 5 時間とする。
- 5 時間を超えた場合は完全再ログインを要求する。
- PIN でセッション寿命を延長する仕様は持たない。
- `session_version` が DB と JWT で一致しない場合は失効扱いにする。
- アカウント停止、パスワード変更、端末紛失時の停止では既存 session を失効させる。

## 6. 失敗・監査・監視

- ログイン失敗は `login_attempts` に記録する。
- ログイン失敗 5 回で一時ロックする。
- MFA 失敗、端末登録失敗、権限逸脱、rate limit 超過は security signal として記録する。
- admin 監視画面では security signal、ログイン失敗、API 失敗、通知失敗、バックアップ結果を確認できるようにする。

## 7. 廃止済み要件

以下は過去の検討・実装履歴であり、現行要件ではない。

- EMS 30分無操作後 PIN
- HOSPITAL 60分無操作後 PIN
- 3時間無操作 PIN 再開
- 8時間完全再ログイン
- PIN 5回失敗ロック
- `pinUnlockedAt`
- `/api/security/pin`
- `SecuritySessionGate` の PIN overlay

## 8. 受入条件

- EMS / HOSPITAL は WebAuthn MFA 未完了では保護画面に入れない。
- EMS / HOSPITAL は端末未登録では保護画面に入れない。
- ADMIN / DISPATCH は現段階では MFA 未設定でも通常画面に入れる。
- 5 時間超過後は完全再ログインになる。
- PIN API、PIN overlay、PIN session state が存在しない。
- 端末紛失時は既存端末を停止し、予備端末へ登録コードを発行して引き継げる。

## 9. 関連文書

- `docs/policies/auth-authorization-policy.md`
- `docs/operations/device-registration-guide.md`
- `docs/operations/lost-device-runbook.md`
- `docs/policies/security-logging-policy.md`
