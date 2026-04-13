# HOSPITAL MFA 一時停止実装メモ

最終更新: 2026-04-13

## 実施内容

### コード

- `lib/mfaPolicy.ts`
  - `MFA_REQUIRED_ROLES` を空集合に変更した
  - コメントで「一時停止理由」「戻し先」「再登録前提」を明記した

- `components/settings/CurrentDeviceStatusPanel.tsx`
  - HOSPITAL かつ `mfaRequired=false` の場合、通常の MFA 説明ではなく
    - 現在はローカル検証のため一時停止中
    - 再開時は ADMIN 案内で再登録
    - 紛失時は停止優先
    を表示するようにした

- `app/hp/settings/device/page.tsx`
  - HOSPITAL 端末情報ページの説明文に、一時停止中であることを追記した

### DB

- 削除対象:
  - `user_mfa_credentials`
  - `user_mfa_challenges`
- 削除条件:
  - `users.role = 'HOSPITAL'`

想定 SQL:

```sql
DELETE FROM user_mfa_challenges
WHERE user_id IN (
  SELECT id FROM users WHERE role = 'HOSPITAL'
);

DELETE FROM user_mfa_credentials
WHERE user_id IN (
  SELECT id FROM users WHERE role = 'HOSPITAL'
);
```

## 復旧時の実務メモ

### コード復旧

`lib/mfaPolicy.ts`

```ts
export const MFA_REQUIRED_ROLES = new Set(["HOSPITAL"]);
```

### DB / 運用復旧

- 削除済み credential は復元しない
- HOSPITAL 利用者に再登録を依頼する
- localhost で再検証する場合は、再登録したブラウザプロファイルを固定する

### 再確認項目

1. HOSPITAL ログイン後に `/mfa/setup` または `/mfa/verify` が出る
2. WebAuthn 操作後に `/hospitals/requests` へ遷移できる
3. `設定 > 端末情報` で `WebAuthn MFA: 登録済み`
4. `/api/security/mfa/status` が `mfaRequired=true` を返す

## 注意

- 本メモは「ローカル導線確認を優先するための一時停止」用であり、本番前には戻す前提
- 再導入時は docs も通常方針へ戻す
