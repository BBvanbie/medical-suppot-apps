# EMS/HP Unified UI and Notification Design

**Date:** 2026-03-06

## Scope
- A側/HP側の画面構造を仕様準拠に整理し、不要ページを統合削除する。
- 共通レイアウト（トップバー/サイドバー）を両ロールで統一し、A側は青、HP側は緑を基調にする。
- 相談チャットモーダルを共通コンポーネント化し、事案一覧・事案詳細・病院側一覧で再利用する。
- 通知バッジ（ベル+未読数、メニュー/タブ赤点）とポップアップ通知を実装する。
- DB/APIの送受信整合を確保し、既存ステータス遷移ロジックと矛盾しないよう整理する。

## Architecture
- 画面レイヤー:
  - 共通シェル `PortalShell`（role: `EMS` / `HOSPITAL`）
  - ナビ定義をロール別JSON化し、Topbar/Sidebarを共通レンダリング
  - 相談UIは `ConsultChatModal` に集約
- データレイヤー:
  - 既存 `hospital_request_*` テーブルを維持
  - 新規 `notifications` テーブルを追加し、通知イベントを保存
  - 業務API（要請送信/ステータス更新/相談返信/搬送決定）内で通知生成を同一トランザクションで実施
- 配信レイヤー:
  - 初期はポーリング（15秒）
  - 即時性が必要な操作後は手動再取得で補強

## Data Model
### New table: notifications
- `id BIGSERIAL PRIMARY KEY`
- `audience_role TEXT NOT NULL CHECK (audience_role IN ('EMS','HOSPITAL'))`
- `team_id INTEGER NULL REFERENCES emergency_teams(id)`
- `hospital_id INTEGER NULL REFERENCES hospitals(id)`
- `target_user_id BIGINT NULL REFERENCES users(id)`
- `kind TEXT NOT NULL`
- `case_id TEXT NULL`
- `target_id BIGINT NULL REFERENCES hospital_request_targets(id)`
- `title TEXT NOT NULL`
- `body TEXT NOT NULL`
- `menu_key TEXT NULL`
- `tab_key TEXT NULL`
- `is_read BOOLEAN NOT NULL DEFAULT FALSE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `read_at TIMESTAMPTZ NULL`

Indexes:
- `(audience_role, team_id, hospital_id, is_read, created_at DESC)`
- `(target_user_id, is_read, created_at DESC)`
- `(case_id, target_id)`

## Notification Event Mapping
- EMS受信:
  - HP status change（受入可能/受入不可/要相談）
  - HP相談コメント
- HOSPITAL受信:
  - A側から要請送信
  - A側搬送決定/辞退
  - A側相談コメント

## UI Rules
- ベルアイコン右上に未読件数（赤バッジ）
- サイドバー/タブは未読ありで赤点表示
- ポップアップ通知:
  - 共通: 相談コメント受信
  - EMS: HP status変化
  - HP: 要請受信、搬送決定受信

## Cleanup Policy
- 重複ページ（旧相談ページ等）を削除し、一覧+詳細導線へ統合。
- 文字化け文字列を正規化（UTF-8で保存）。
- 既存APIの役割重複を避け、通知は専用ユーティリティで発火。

## Validation
- TypeScript型チェック
- 主要APIのエラーパス確認
- A/HP双方の通知表示動作確認（未読増加、既読化、ポップアップ）
