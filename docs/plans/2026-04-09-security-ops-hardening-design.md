# 2026-04-09 Security / Ops Hardening Design

## 目的

- 現行の `ID / Password + next-auth Credentials` ベース認証を、医療運用として最低限必要な認証強化、セッション統制、アカウント統制、運用保全へ段階拡張する。
- いきなり実装へ入らず、まず「現状であるもの / ないもの」「このプロジェクトで先に決めるべき運用ルール」を明文化する。
- 実装順を誤って認証体験や現場運用を壊さないよう、設計・仕様・段階導入の前提を残す。

## 現状整理

### 1. 既存で確認できたもの

- 認証は `next-auth` Credentials Provider を使用している。
  - 参照: [auth.config.ts](/C:/practice/medical-support-apps/auth.config.ts)
- セッションは `jwt` strategy のみで、追加の MFA / device binding / session DB は未導入。
  - 参照: [auth.config.ts](/C:/practice/medical-support-apps/auth.config.ts)
- ログイン成功時に `users.last_login_at` は更新している。
  - 参照: [auth.config.ts](/C:/practice/medical-support-apps/auth.config.ts)
- `users.is_active` によるアカウント無効化は存在する。
  - 参照: [auth.config.ts](/C:/practice/medical-support-apps/auth.config.ts), [authContext.ts](/C:/practice/medical-support-apps/lib/authContext.ts)
- ADMIN 画面には端末失効 UI があるが、認証セッション制御や端末証明まではつながっていない。
  - 参照: [AdminDevicesPage.tsx](/C:/practice/medical-support-apps/components/admin/AdminDevicesPage.tsx)

### 2. 既存で不足していること

- MFA がない
- 無操作タイムアウト、絶対セッション期限、強制ログアウト、全端末失効がない
- ログイン試行回数制限、アカウントロック、CAPTCHA 相当がない
- API ごとのレート制限がない
- 初回パスワード設定、再設定、トークン失効管理がない
- 異動 / 退職 / 端末紛失時の運用フローと UI/API がつながっていない
- バックアップ / リストア、保持期間、復旧目標が未整理
- uptime / API error / DB 障害 / 通知失敗などの監視設計が未整理

## 前提と制約

### システム前提

- 現在の認証基盤は `next-auth` Credentials Provider と `users` テーブル中心であり、外部 IdP 前提ではない。
- ロールは `EMS / HOSPITAL / ADMIN / DISPATCH` の 4 種で、運用影響は role ごとに異なる。
- 既存 UI はログイン導線が単純で、認証の多段化を入れると `/login`、session callback、保護 route、設定 UI をまとめて見直す必要がある。

### 導入制約

- 一括全面刷新ではなく、既存ユーザー運用を壊さない段階導入が必要。
- まず「防御として最低限必要な controls」を優先し、その後に利便性や監査 UI を拡張する。
- API 制御、管理 UI、運用 Runbook を別々に作らず、同じ設計セットで決める必要がある。

## 論点別の設計方針

### 1. MFA

#### 案A. TOTP を全 role に必須化

- 利点
  - 強度は高い
  - 実装が比較的標準的
- 欠点
  - 初期導入時の現場負担が大きい
  - 端末紛失時の再発行運用が先に必要

#### 案B. TOTP を `ADMIN` 必須、他 role は段階導入

- 利点
  - 最初の導入負荷が低い
  - 事故影響が大きい高権限から先に締められる
- 欠点
  - role ごとの差が一時的に残る

#### 決定

- `EMS` と `HOSPITAL` は MFA 必須とする。
- MFA の構成要素は `ID / Password / 端末情報` を前提にする。
- 端末情報が紐づいていない状態では利用不可とする。
- `ADMIN` と `DISPATCH` は今回の初期確定対象外とし、後続で必須化方針を再評価する。
- 現時点は開発段階のため、MFA は設計完了までを今回の到達点とし、実装着手は一旦 stop とする。

#### 推奨実装方針

- 「認証アプリの6桁コード」ではなく、まずは `登録済み端末でのみ継続利用可能` な端末バインドを中核に置く。
- 端末バインド単独では弱いため、将来的に TOTP や recovery code を追加できる構造で設計する。
- `EMS / HOSPITAL` は最低でも以下を満たす。
  - 正しい ID / Password
  - 有効なアカウント
  - 登録済み端末からのアクセス

### 2. セッション管理

#### 決定

- 無操作 3 時間で「完全ログアウト」ではなく「PIN による再入場」へ移行する。
- セッション開始から 8 時間経過したら完全再ログインを必須にする。
- 端末紛失・アカウント停止・パスワード再設定時は、既存セッションを無効化する。
- PIN は 6 桁とする。
- PIN 入力失敗は 5 回で一時ロックする。

#### 必須仕様として先に決めること

- 3 時間無操作時の PIN ロック画面の挙動
- 8 時間超過時の完全再認証
- ログアウト / 全端末失効 / アカウント停止時の既存セッション無効化
- パスワード変更時の既存セッション無効化

#### 推奨

- JWT のみではなく、`session_version` または `session invalidation version` を `users` に持たせる。
- `users.session_version` を token に埋め、毎回または一定間隔で照合する。
- `is_active = false`、password reset 完了、admin 強制失効時に `session_version` を更新して既存 token を無効化する。
- 3 時間無操作時の短い PIN ロックは、完全ログアウトとは別レイヤーで扱う。
- 8 時間絶対期限は role 共通の first implementation とする。

### 3. ログイン保護

#### 推奨

- `login_attempts` の専用テーブルを追加する。
- キーは最低でも `username + ip`、可能なら `username` 単体も見る。
- 段階制御:
  - 短時間の試行回数超過で一時ロック
  - 長時間の異常時は管理解除が必要なロック
  - CAPTCHA は後段でもよいが、少なくとも rate limit と lockout は先行

### 4. API レート制限

#### 対象優先順

1. `/api/auth` 相当のログイン系
2. `/api/cases/send-history`、`/api/hospitals/requests/*/status` の更新系
3. `search`、`notifications` の高頻度読み取り

#### 推奨

- 最初は DB または Redis 互換の単純な fixed/sliding window を route helper で共通化する。
- role と endpoint 種別で policy を分ける。
- 429 時の UI 文言、監査ログ、運用アラートまで定義する。
- 初期の推奨値は以下とする。
- ログイン: `5 回 / 5 分`
- 重要更新 API: `30 回 / 分`
- 検索 API: `60 回 / 分`
- 通知取得 API: `30 回 / 分`

### 5. パスワード再設定

#### 決定

- パスワード再設定は「本人から電話連絡を受けた ADMIN が一時パスワードを設定する」方式とする。
- 一時パスワードでログイン後、本人が新しいパスワードへ変更する。
- メールリンク方式は初期採用しない。
- 一時パスワードの有効期限は 24 時間とする。

#### 推奨

- 初回発行と再設定を分けて設計する。
- `password_reset_tokens` テーブルを用意し、単回使用・短寿命・使用後失効を徹底する。
- 初期方式は `管理者発行型` とし、本人確認チャネルは電話を正本にする。
- 一時パスワードは短寿命、単回利用、初回ログイン後に強制変更とする。

### 6. アカウント停止 / 失効

#### 決定

- 端末紛失時はアカウント停止を行う。
- 新規端末または予備端末へ情報を引き継いだあとで再開する。
- 「紛失端末だけ失効」ではなく、初期運用は `account stop` を正本にする。

#### 推奨

- `is_active` だけでは不十分。
- 次を分ける:
  - アカウント無効化
  - セッション全失効
  - MFA 再登録要求
  - 端末失効
- 初期段階では `account stop + 全セッション失効 + 新端末再登録` を最短運用とする。
- ADMIN 管理 UI から即時実行でき、監査ログへ残ることを要件化する。

### 7. バックアップ / リストア

#### 決定

- バックアップは 1 日 2 回、`12:00` と `24:00` に実施する。
- 初期段階では PostgreSQL を最優先バックアップ対象とする。
- バックアップ保持期間は 14 日とする。
- 復旧目標は `RPO 12 時間 / RTO 4 時間` を初期値とする。

#### 先に決めること

- 何をバックアップ対象にするか
  - PostgreSQL
  - 添付や将来の外部ストレージ
  - 監査ログ
- RPO / RTO
- 保持期間
- リストア権限と手順
- 定期 restore drill の有無

#### 推奨

- 本テーマでは「アプリ実装」より先に運用仕様書と手順を定義する。
- 実装対象は backup job trigger / status 表示より後回しでよい。
- ただし管理画面では「直近バックアップ時刻 / 成否」は見えるようにする。

### 8. 監視 / 障害検知

#### 決定

- 監視情報はそれぞれの管理画面で見えるようにする。
- `ADMIN` は全体監視可能とする。
- role ごとの見える範囲は絞る。
  - EMS: 自隊系の主要異常
  - HOSPITAL: 自院系の主要異常
  - ADMIN: 全体
- 初期の監視画面では以下を優先表示する。
  - アプリ生存監視
  - DB 接続異常
  - ログイン失敗急増
  - 更新 API 失敗率急増
  - 通知生成 / 配信失敗
  - バックアップ失敗

#### 推奨

- 最低限以下を別カテゴリで監視する。
  - アプリ生存監視
  - DB 接続異常
  - ログイン失敗急増
  - 更新 API 失敗率急増
  - 通知生成 / 配信失敗
  - バックアップ失敗
- 現状は scheduler / worker / external monitor の前提がないため、まずは `アプリ内監視画面` を正本にする。
- 後続で外部通知連携を追加できる構造にする。

## 段階導入方針

### Phase 1: 認証防御の土台

- ログイン試行制限
- アカウントロック
- セッション version 化
- 強制ログアウト / 全端末失効
- パスワード再設定 token 基盤
- 端末バインドの土台
- 3 時間無操作時の PIN ロック
- 8 時間絶対期限

### Phase 2: 認証強化

- 端末バインド管理 UI
- PIN 再設定
- 管理 UI での account recovery / 端末再登録

### Phase 3: 運用保全

- レート制限の全 API 共通化
- 監視 / アラート
- バックアップ / リストア運用定着
- 定期 drill と監査証跡

## 先にヒアリングが必要な項目

1. `ADMIN` と `DISPATCH` に MFA を後続で必須化するか

## 影響範囲

- 認証: [auth.config.ts](/C:/practice/medical-support-apps/auth.config.ts), [auth.ts](/C:/practice/medical-support-apps/auth.ts), [LoginForm.tsx](/C:/practice/medical-support-apps/components/auth/LoginForm.tsx)
- session 参照: [authContext.ts](/C:/practice/medical-support-apps/lib/authContext.ts)
- 管理 UI: [AdminDevicesPage.tsx](/C:/practice/medical-support-apps/components/admin/AdminDevicesPage.tsx)
- 設定 / 運用 docs: [system-spec-2026-03-29.md](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md), [current-work.md](/C:/practice/medical-support-apps/docs/current-work.md)

## 非目標

- 今回の design では SSO / 外部 IdP への全面移行までは決めない
- 今回の design ではインフラ製品選定を最終確定しない
- 今回の design では監視 SaaS や secrets manager の具体製品比較までは行わない
