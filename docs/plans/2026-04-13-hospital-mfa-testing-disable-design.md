# HOSPITAL MFA 一時停止設計

最終更新: 2026-04-13

## 結論

- ローカル検証を優先するため、`HOSPITAL` の通常ログイン WebAuthn MFA を一時停止する。
- `ADMIN / DISPATCH` は従来どおり対象外、`EMS` も従来どおり対象外のままとし、今回の変更は `HOSPITAL` のみを対象にする。
- 再導入は `lib/mfaPolicy.ts` と DB の MFA credential 再登録で元に戻せる形を維持する。

## 背景

- HOSPITAL 導線確認や Playwright / ローカルブラウザ確認で、登録済みパスキーがブラウザプロファイル依存となり、検証端末の切替コストが高い。
- 一時的に MFA を外しても、端末登録、通常ログイン、role guard、session version、lockout、temporary password、監視イベントなど他の認証 hardening は維持できる。

## 今回の方針

### 1. 強制ロジックだけを止める

- `lib/mfaPolicy.ts` の required role から `HOSPITAL` を外す。
- これにより:
  - NextAuth JWT callback の `mfaRequired` が false になる
  - `getAuthenticatedUser()` が `mfaVerified` 未完了でも HOSPITAL を弾かなくなる
  - `/api/security/mfa/status` は `mfaRequired=false` を返す

### 2. DB credential は削除する

- `user_mfa_credentials`
- `user_mfa_challenges`
- 対象は `users.role = 'HOSPITAL'`

理由:

- 再導入時に古い localhost パスキー前提の credential が残ると、検証者がどの credential を使うべきか分かりにくい。
- 「再導入時は再登録する」という運用に寄せた方が事故が少ない。

### 3. 利用者向け表示を矛盾させない

- HOSPITAL の端末情報画面では、一時停止中であることを明示する。
- 端末状態 panel では `mfaRequired=false` の HOSPITAL 向け説明を出す。

## 非目標

- WebAuthn 実装自体の削除
- MFA API / page / repository の削除
- 将来の step-up MFA 設計の削除

## 再導入手順

1. `lib/mfaPolicy.ts` の `MFA_REQUIRED_ROLES` に `HOSPITAL` を戻す。
2. 必要なら HOSPITAL 向け説明文を通常文言へ戻す。
3. 対象病院アカウントで `/mfa/setup` または通常ログイン導線から WebAuthn MFA を再登録する。
4. `設定 > 端末情報` で `WebAuthn MFA: 登録済み` を確認する。
5. HOSPITAL ログアウト後ログインで `/mfa/verify` を経由することを確認する。

## 影響ファイル

- `lib/mfaPolicy.ts`
- `components/settings/CurrentDeviceStatusPanel.tsx`
- `app/hp/settings/device/page.tsx`
- `docs/current-work.md`

## 検証

- `npm run check`
- HOSPITAL ログイン後に `/hospitals/requests` へ直接入れること
- `/api/security/mfa/status` が HOSPITAL でも `mfaRequired=false` を返すこと
