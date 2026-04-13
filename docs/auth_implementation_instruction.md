# 認証・MFA 実装指示書

## 1. 目的

本書は、現在の認証実装を変更・点検するときの実装指示書である。現行方針は `username + password` を基本認証とし、HOSPITAL ではログイン後に WebAuthn MFA と端末登録を必須、EMS では端末登録のみ必須にする。

> 2026-04-13 追記: ローカル導線確認のため、HOSPITAL の通常ログイン MFA は一時停止中。再開手順は `docs/plans/2026-04-13-hospital-mfa-testing-disable-implementation.md` を参照。

## 2. 現行方針

### 2-1. ロール別の必須要件

| ロール | 通常ログイン MFA | 端末登録 | 備考 |
|---|---|---|---|
| EMS | 対象外 | 必須 | iPad などの現場端末を登録する |
| HOSPITAL | 必須 | 必須 | 病院 PC を登録する |
| ADMIN | 対象外 | 不要 | step-up MFA を後から入れられる構造を維持する |
| DISPATCH | 対象外 | 不要 | 通常ログイン導線では MFA を要求しない |

### 2-2. セッション

- セッション最大時間は 5 時間とする。
- セッション期限超過後は完全再ログインを必須とする。
- アカウント停止、パスワード変更、セッション version 不一致では既存セッションを失効させる。
- PIN による 30分 / 60分再開ロックは現行仕様では使わない。

### 2-3. PIN の扱い

- PIN はログイン導線に組み込まない。
- `/api/security/pin` は現行仕様では提供しない。
- `pinUnlockedAt` を session / JWT に保持しない。
- 旧 DB に PIN 関連カラムが残っている場合でも、アプリケーションからは参照・更新しない。

## 3. 実装責務

### Auth.js

- `auth.config.ts` で `authenticatedAt` を保持し、5 時間超過時に `authExpired` を立てる。
- `session_version` を照合し、強制失効を反映する。
- HOSPITAL では `mfaRequired` と `deviceEnforcementRequired` を session に反映する。EMS では `deviceEnforcementRequired` のみ必須とする。
- MFA 完了後のみ `authLevel = "full"` とする。

### Proxy / routing

- 未認証ユーザーは `/login` へ送る。
- 一時パスワード変更が必要なユーザーは `/change-password` へ送る。
- MFA 未完了の HOSPITAL は `/mfa/*` へ送る。
- 端末未登録の EMS / HOSPITAL は `/register-device` へ送る。
- `/mfa/*` と `/register-device` の相互 redirect loop を作らない。

### WebAuthn MFA

- HOSPITAL はログアウト後のログインで WebAuthn MFA を必須とする。EMS は現行方針では対象外とする。
- credential は `user_mfa_credentials` に保存する。
- challenge は `user_mfa_challenges` に保存し、期限切れ・消費済み challenge は拒否する。
- 認証失敗、期限切れ、登録失敗は security signal として監視へ出す。

### 端末登録

- 登録コードは admin が発行する。
- EMS はチームに紐づく端末、HOSPITAL は病院に紐づく端末だけ登録できる。
- 登録コードは 24 時間で失効する。
- 端末紛失・故障時は既存端末を lost/inactive 扱いにし、予備端末へ登録コードを発行して切り替える。

### ADMIN step-up MFA

- ADMIN の通常ログイン MFA は現行方針では対象外とする。
- 将来の高リスク操作向けに、操作実行直前に MFA 再確認できる設計を残す。
- 対象候補はユーザー停止、端末失効、ロール変更、監査ログ export、設定変更など。

## 4. 廃止済み仕様

以下は旧仕様であり、新規実装・テストの前提にしない。

- EMS 30分無操作後 PIN
- HOSPITAL 60分無操作後 PIN
- 3時間無操作 PIN 再開
- 8時間完全再ログイン
- `/api/security/pin`
- `SecuritySessionGate` による PIN overlay
- `pinUnlockedAt`

## 5. 受入確認

- HOSPITAL は `username + password` 後、WebAuthn MFA が完了しない限り保護画面に進めない。EMS は MFA なしで端末登録へ進める。
- EMS / HOSPITAL は端末登録が完了しない限り保護画面に進めない。
- ADMIN / DISPATCH は現行方針では MFA 対象外として通常画面へ入れる。
- 5 時間を超えた session は完全再ログインへ戻る。
- PIN API、PIN overlay、PIN session state が存在しない。
- MFA 失敗、端末登録失敗、権限逸脱は監視画面の security signal に反映される。

## 6. 関連ファイル

- `auth.config.ts`
- `proxy.ts`
- `lib/mfaPolicy.ts`
- `lib/securityAuthRepository.ts`
- `lib/securityAuthSchema.ts`
- `app/api/security/mfa/*`
- `app/api/security/device-register/route.ts`
- `docs/policies/auth-authorization-policy.md`
- `docs/operations/device-registration-guide.md`
