# 2026-04-09 Security / Ops Hardening Implementation Plan

> 2026-04-11 追記: 本書の PIN 再開、3時間無操作、8時間完全再ログインの実装計画は履歴です。現行仕様では `/api/security/pin`、`SecuritySessionGate`、`pinUnlockedAt` は削除済みで、EMS / HOSPITAL は WebAuthn MFA と端末登録を必須にします。現行方針は `docs/auth_requirements_definition.md` と `docs/auth_implementation_instruction.md` を参照してください。

## 目的

- `security / operations hardening` を実装可能な単位に分解し、認証・セッション・運用を段階導入する。
- 1 回のリリースで全部を抱えず、破壊半径の小さい順に進める。

## 実装順

### Step 1. ログイン保護の基盤

- 追加:
  - `login_attempts` テーブル
  - username / ip 単位の失敗カウント
  - 一時ロック判定 helper
  - 成功時の失敗カウントリセット
- 変更:
  - [auth.config.ts](/C:/practice/medical-support-apps/auth.config.ts)
  - `/login` の失敗文言と lockout 文言
- 完了条件:
  - 連続失敗でログイン拒否
  - 解除時間前は正しいパスワードでも拒否
  - 管理解除または時間経過で復帰
- 状態:
  - 実装済み
  - `auth.config.ts` に lockout 判定を追加済み
  - `/api/security/login-status` と login form の文言反映済み
  - ADMIN users 画面から `ロック解除` を実行可能
  - focused E2E で unlock 往復を確認

### Step 2. セッション失効制御と PIN ロック（PIN 部分は廃止）

- 追加:
  - `users.session_version`
  - session version を token に持たせる callback
  - 強制失効 helper
  - `devices.registered_device_key` による端末キー継続識別
- 廃止済み仕様:
  - 端末ごとの PIN lock state
  - 3 時間無操作判定
  - 6 桁 PIN
  - PIN 失敗 5 回ロック
- 変更:
  - [auth.config.ts](/C:/practice/medical-support-apps/auth.config.ts)
  - [authContext.ts](/C:/practice/medical-support-apps/lib/authContext.ts)
  - ADMIN のアカウント停止 / 失効 UI
- 完了条件:
  - account stop / password reset / admin revoke 後に既存セッションが無効化される
  - セッション開始から 5 時間超過で完全再ログインになる
- 状態:
  - `users.session_version` は継続利用
  - `user_security_devices` は 2026-04-11 に廃止し、端末登録状態は `devices` に集約
  - `SecuritySessionGate`、PIN API、PIN repository functions、`pinUnlockedAt` は 2026-04-11 に削除済み

### Step 3. パスワード再設定

- 追加:
  - ADMIN による一時パスワード発行 API
  - 一時パスワード失効 / 単回使用制御
  - 初回ログイン後の強制再設定 UI
- 確定仕様:
  - 一時パスワード有効期限は 24 時間
- 要確認:
  - 電話本人確認の運用文言
- 完了条件:
  - ADMIN が一時パスワードを設定できる
  - ユーザーは一時パスワードで 1 回だけログインできる
  - ログイン後は本人が新しいパスワードへ変更する
  - 使用後に全セッション失効
- 状態:
  - 実装済み
  - `users.must_change_password` と `temporary_password_expires_at` を利用し、専用 token table は未採用
  - ADMIN users 画面から一時パスワード発行可
  - `/change-password` と `/api/security/change-password` を追加済み
  - 一時パスワード利用後の強制変更と session version bump を導入済み
  - focused E2E で temporary password -> forced change -> 再ログインを確認

### Step 4. 端末バインド MFA 基盤

- 追加:
  - `devices` テーブル拡張による端末登録情報
  - 登録コード発行 API
  - 端末登録 / 端末失効 / 端末再登録 API
  - アカウント停止後の再開フロー
- 方針:
  - TOTP などの追加要素はまだ入れず、先に `ID / Password + 登録済み端末` を成立させる
- 変更:
  - `/login` の端末確認ステップ
  - ADMIN の account stop / 再開導線
- 完了条件:
  - `EMS / HOSPITAL` は登録済み端末からのみ利用可能
  - 端末紛失時はアカウント停止し、新端末再登録後に再開できる
- 状態:
  - 基盤実装済み
  - `devices` 拡張、登録コード発行、`/register-device`、端末登録 API を導入済み
  - `EMS / HOSPITAL` の未登録端末は登録画面へ誘導される
  - docs は [device-registration-guide.md](/C:/practice/medical-support-apps/docs/operations/device-registration-guide.md) に整理済み
  - 2026-04-22:
    - `lib/mfaPolicy.ts` に HOSPITAL MFA 一時停止中の補助 helper を追加した
    - `app/login/page.tsx` に HOSPITAL 向けの一時停止案内を追加した
    - `components/settings/CurrentDeviceStatusPanel.tsx` は HOSPITAL かつ `mfaRequired=false` の場合に `WebAuthn MFA: 一時停止中` を表示するようにした
    - `components/auth/WebAuthnMfaCard.tsx` は、一時停止中の HOSPITAL が MFA 画面を手動で開いた場合に停止理由を表示し、そのまま業務画面へ戻せるようにした
    - `app/admin/settings/security/page.tsx` の運用説明を現行方針へ更新した
    - focused E2E:
      - `e2e/tests/device-registration.spec.ts` に HOSPITAL 端末情報の `一時停止中` 表示と login 画面の案内確認を追加した
  - 残りは `deviceKey` から fingerprint 強化する詳細設計と、追加要素を有効化する運用判断

### Step 5. API レート制限

- 追加:
  - route 共通 `rateLimit` helper
  - endpoint policy map
  - 429 response formatter
- 対象優先:
  - login
  - send-history / hospital status update
  - notifications
  - search
- 初期 policy:
  - login: `5 回 / 5 分`
  - 重要更新 API: `30 回 / 分`
  - search: `60 回 / 分`
  - notifications: `30 回 / 分`
- 完了条件:
  - 主要 endpoint に policy が適用される
  - 429 がログと UI で識別できる
- 状態:
  - 実装済み
  - [rateLimit.ts](/C:/practice/medical-support-apps/lib/rateLimit.ts) を追加し、login / search / notifications / 重要更新 API に適用した
  - 429 時は route ごとの日本語メッセージと `Retry-After` を返す
  - `system_monitor_events` に rate limit hit を warning として記録する
  - focused E2E で notifications API の 429 を確認

### Step 6. 運用保全

- docs:
  - backup / restore 手順
  - account disable / lost device runbook
  - incident response flow
- optional implementation:
  - ADMIN 監視画面の最小ステータス
  - backup result / alert summary の表示
- 確定仕様:
  - バックアップ保持期間は 14 日
  - 復旧目標は `RPO 12 時間 / RTO 4 時間`
  - 監視初期表示は `アプリ生存監視 / DB 接続異常 / ログイン失敗急増 / 更新 API 失敗率急増 / 通知生成・配信失敗 / バックアップ失敗`
- 状態:
  - 初期実装済み
  - [backup-restore-runbook.md](/C:/practice/medical-support-apps/docs/operations/backup-restore-runbook.md) を追加した
  - [systemMonitor.ts](/C:/practice/medical-support-apps/lib/systemMonitor.ts) に監視イベントとバックアップ結果テーブルを追加した
  - `/api/admin/monitoring/backup-runs` でバックアップ結果を記録できるようにした
  - `/admin/monitoring` で 6 つの主要シグナルと直近イベントを表示できるようにした
  - API 失敗、通知失敗、rate limit hit が監視イベントに記録される

## 想定スキーマ追加

- `users`
  - `session_version INT NOT NULL DEFAULT 1`
  - `password_changed_at TIMESTAMPTZ NULL`
  - `must_change_password BOOLEAN NOT NULL DEFAULT FALSE`
  - `temporary_password_expires_at TIMESTAMPTZ NULL`
  - `locked_until TIMESTAMPTZ NULL` または login_attempts で管理
- `login_attempts`
  - `id`
  - `username`
  - `ip_hash_or_ip`
  - `attempted_at`
  - `success`
  - `failure_reason`
- `password_reset_tokens`
  - `id`
  - `user_id`
  - `token_hash`
  - `expires_at`
  - `used_at`
  - `issued_by`
- 旧 `trusted_devices` / `user_security_devices`
  - PIN 再開廃止に伴い採用しない
  - 現行の端末登録状態は `devices.registered_device_key` と `devices.registered_user_id` に集約

## API / UI 影響

### 認証

- [auth.config.ts](/C:/practice/medical-support-apps/auth.config.ts)
- [LoginForm.tsx](/C:/practice/medical-support-apps/components/auth/LoginForm.tsx)
- `app/login/*`

### 管理運用

- ADMIN のアカウント管理
- ADMIN の端末 / 失効 UI
- 設定配下の security メニュー追加

### 共通保護

- `authContext`
- route access helper
- 主要 update API への rate limit helper 適用

## 検証方針

### unit / integration

- login attempt counter
- lockout 判定
- session version mismatch
- password reset token validation
- MFA verify
- rate limit helper

### focused E2E

- 正常ログイン
- 連続失敗で lockout
- password reset 後の旧 session 無効化
- MFA 必須 user の 2 段階ログイン
- ADMIN による account disable 後の即時失効

## リスク

- JWT only 前提からの拡張で callback 複雑度が上がる
- 端末バインドの fingerprint 設計を雑にすると誤判定や bypass の温床になる
- 端末登録と WebAuthn MFA の境界を曖昧にすると、誤判定や bypass の温床になる
- rate limit を厳しくしすぎると現場操作を阻害する

## 次の実装開始条件

次の残件着手条件は以下。

1. 端末 fingerprint / 登録情報の持ち方
2. backup run report を scheduler / job から自動送信する接続
3. `ADMIN / DISPATCH` の MFA 必須化タイミング
