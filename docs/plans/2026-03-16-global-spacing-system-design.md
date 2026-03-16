# Global Spacing System Design

**Date:** 2026-03-16

## Goal

`app/` 配下の主要画面で spacing の基準を揃え、ページごとの余白ばらつきを減らしつつ、今後の画面追加でも再利用できる共通レイアウト基盤を作る。

## Scope

- shell レベルの余白トークン整備
- 再利用可能な layout primitives の導入
- settings / admin / hospital / EMS の共通部品への適用
- 既存 `dashboard-shell` まわりの余白整理
- ページ単位で使える spacing token / variant の定義

## Non-Goals

- 全画面の一斉デザイン刷新
- 情報設計そのものの見直し
- 個別 UI の細かな見た目調整

## Approach

### Option 1: Reusable layout primitives + shell tokens

`PageFrame`, `PageSection`, `ContentCard`, `ActionRow`, `TableSection`, `FormStack` を導入し、shell 側は CSS token で制御する。

- 利点: 再利用しやすい
- 利点: 既存画面へ段階的に適用できる
- 利点: shared component にも波及しやすい

### Option 2: CSS-only normalization

global class だけで padding / margin を揃える。

- 利点: 早い
- 欠点: 意図がコードに残りにくい
- 欠点: 例外画面の扱いが難しい

## Recommendation

今回は Option 1 を採用する。token と primitive を先に作る方が、今後のページ追加でも spacing を安定させやすい。

## Design

### 1. Shell spacing tokens

`app/globals.css` に以下を定義する。

- page shell outer padding token
- page max width token
- section gap token
- card padding token
- table wrapper padding token
- modal inner padding token

### 2. Layout primitives

- `PageFrame`: `default / form / wide / full` の variant
- `PageSection`: title / description / action / content を持つ枠
- `ContentCard`: `compact / default / spacious` の padding variant
- `ActionRow`: action 群の gap と alignment を扱う
- `FormStack`: フォーム用の縦積み wrapper
- `TableSection`: title bar + table container をまとめる wrapper

### 3. Shared adoption points

- `PortalShellFrame`
- `AdminPortalShell`
- `SettingPageLayout`
- `SettingSection`
- `SettingCard`
- `SettingLinkCard`
- `SettingsOverviewPage`

### 4. Direct page adoption points

- login
- EMS case detail fallback
- hospital search
- hospital request confirm / completed
- EMS case form main wrapper

## Exceptions

- 横幅の広い table は `wide` variant を許容する
- fixed overlay 系は独自 padding を持ってよい
- 業務上の例外 UI は個別調整を許可する

## Testing

- `npm.cmd run lint`
- 手動確認:
  - `/settings`
  - `/cases/search`
  - `/hospitals/search`
  - `/admin/settings`
  - login
