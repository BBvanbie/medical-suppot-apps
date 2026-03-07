# EMS and Hospital Settings Routing Separation Design

**Date:** 2026-03-07

## Scope
- EMS 側設定を `/settings/*` に整理し、既存の共通プレースホルダから役割を明確化する。
- HOSPITAL 側設定を `/hp/settings/*` に新設し、病院側サイドバー導線を `/settings` から分離する。
- EMS/HOSPITAL それぞれに設定トップと詳細ページ群を作成する。
- `hidden / readOnly / editable / mixed` のうち、初回はページ分離と UI 表現の土台まで実装する。
- 保存APIの本格実装は後続とし、既存DBから引ける情報の表示を優先する。

## Background
- 現状 `/settings` は EMS/HOSPITAL 共通の仮ページで、仕様のロール別ページ構成に合っていない。
- HOSPITAL 側サイドバーの設定導線も `/settings` を向いており、病院固有設定の入口が存在しない。
- `proxy.ts` は `/paramedics` `/hospitals` `/admin` の大枠保護だけで、設定ルート単位の分離は未整備である。

## Goals
- EMS と HOSPITAL の設定導線をルーティング段階で分離する。
- ページはロール別に分け、共通 primitive のみ再利用する。
- 既存DBから取得できる情報を使って、`readOnly` と `editable` の見え方を整える。
- ADMIN は `/admin/settings` と `/admin/*` に閉じ、EMS/HOSPITAL 設定へは入れない構造にする。

## Non-Goals
- 通知設定、表示設定、入力補助、施設情報などの永続化API実装
- EMS の同期再試行 API
- HOSPITAL の施設編集保存 API
- 監査ログを伴う設定変更処理
- `hidden / readOnly / editable` を全API認可へ接続する完全実装

## Routing Design
### EMS
- `/settings`
- `/settings/device`
- `/settings/sync`
- `/settings/notifications`
- `/settings/display`
- `/settings/input`
- `/settings/support`

### HOSPITAL
- `/hp/settings`
- `/hp/settings/facility`
- `/hp/settings/operations`
- `/hp/settings/notifications`
- `/hp/settings/display`
- `/hp/settings/support`

### ADMIN
- `/admin/settings`
- `/admin/*`

EMS は `/settings/*`、HOSPITAL は `/hp/settings/*` に固定し、ADMIN は別系統とする。

## Access Control
- `/settings/*` は `EMS` のみ許可
- `/hp/settings/*` は `HOSPITAL` のみ許可
- `ADMIN` はどちらも非表示・アクセス不可
- `proxy.ts` で直アクセスも防ぐ
- サイドバーで他ロール向け導線を表示しない

## UI Architecture
### Shared Primitive Components
既存 `components/settings/` を継続利用する。

追加候補:
- `SettingLinkCard`
- `SettingReadOnlyBadge`
- `SettingFieldShell`

ただし、今回も実際に使う分だけ追加する。

### EMS Pages
- 設定トップ
  - 状態サマリー
  - 端末情報
  - 同期
  - 通知設定
  - 表示設定
  - 入力補助
  - サポート
- 詳細ページ
  - `device`, `sync`, `notifications`, `display`, `input`, `support`

### HOSPITAL Pages
- 設定トップ
  - 施設情報
  - 受入運用設定
  - 通知設定
  - 表示設定
  - サポート
- 詳細ページ
  - `facility`, `operations`, `notifications`, `display`, `support`

### Role Layout Usage
- EMS 設定は既存 EMS シェル上で描画
- HOSPITAL 設定は既存 `HospitalPortalShell` 上で描画
- ページは分けるが、カード・セクション・表示バッジは共通利用する

## Data Usage
### EMS
- `users`
- `emergency_teams`

表示対象:
- 所属隊名
- 隊コード
- ユーザー名
- ロール
- 端末相当の readOnly 情報

### HOSPITAL
- `users`
- `hospitals`

表示対象:
- 病院名
- 施設コード
- 所在地
- 電話番号
- 一部編集可能に見せるプレースホルダ入力

### Placeholder Settings
通知設定・表示設定・入力補助・運用テンプレートは、初回では永続化なしの UI 表示までに留める。

## Permission Presentation
### hidden
- 他ロールにはルートもナビも出さない

### readOnly
- 値は表示する
- 編集UIではなく表示カード/バッジで示す

### editable
- 入力欄やトグルを表示する
- 初回は保存しないが、後続API追加を想定した形にする

### mixed
- HOSPITAL 施設情報で採用
- 正式名称や施設コードは `readOnly`
- 表示用連絡先などは `editable` の見た目だけ先行実装

## Navigation Changes
- EMS サイドバーの `設定` は `/settings` へ維持
- HOSPITAL サイドバーの `設定` は `/hp/settings` に変更
- `NotificationBell` の menu key と導線は既存キーを維持してよい

## Error Handling
- 権限外アクセスは `proxy.ts` で各ロールのホームへ戻す
- DBから情報を引けない場合は、空表示ではなく簡潔な fallback を返す
- プレースホルダ編集UIでは保存ボタンを出さないか、準備中表示に留める

## Testing and Validation
- EMS:
  - `/settings/*` は表示可能
  - `/hp/settings/*` は不可
- HOSPITAL:
  - `/hp/settings/*` は表示可能
  - `/settings/*` は不可
- ADMIN:
  - 両方不可
- EMS/HOSPITAL それぞれのサイドバー設定導線が正しい先へ遷移する
- `readOnly` と `editable` の見え方がセクションごとに区別できる
- `npm.cmd run lint`
- `npm.cmd run build`

## Rollout Sequence
1. `proxy.ts` とサイドバー導線を更新
2. EMS/HOSPITAL の設定ルートを追加
3. 共通UIの不足分を補う
4. 既存DBからの表示データを接続
5. lint/build とロール別アクセス確認
