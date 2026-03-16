# EMS Display Settings Live Apply Design

**Date:** 2026-03-16

## Goal

EMS 表示設定の変更を保存前の段階でも画面へ即時反映し、文字サイズと密度の調整結果をその場で確認できるようにする。

## Scope

- EMS 表示設定フォームのライブ反映
- EMS 画面シェルへの密度反映
- `comfortable / standard / compact` の見た目差分追加
- 表示設定関連コピーの正常化

## Non-Goals

- 永続化 API の刷新
- DB スキーマ変更
- EMS 以外の表示設定反映

## Current State

- `app/settings/page.tsx` と `app/settings/display/page.tsx` に文字化けした文言が残っている
- `components/settings/EmsDisplaySettingsForm.tsx` は draft 編集までで、即時反映が弱い
- `components/ems/useEmsDisplayProfile.ts` は取得中心で、ライブプレビューの経路がない
- `app/globals.css` に EMS 密度差分の適用ポイントが不足している

## Approach Options

### Option 1: Event-driven live preview + density CSS

フォーム変更時にクライアントイベントを発行し、EMS 表示 hook と CSS 変数で反映する。

- 利点: 既存 API を変えずに実装できる
- 利点: App Router 構成に素直に載せられる
- 利点: 影響範囲を EMS に限定しやすい

### Option 2: Shared React context for all EMS routes

EMS 画面全体を provider で包み、context 経由で反映する。

- 利点: React 的には分かりやすい
- 欠点: 導入コストが大きい
- 欠点: 今回の目的に対して構造が重い

## Recommendation

今回は Option 1 を採用する。`useEmsDisplayProfile` とイベント連携を使う方が局所的で安全。

## Design

### 1. Copy repair

`app/settings/page.tsx` の UTF-8 崩れを直し、eyebrow や説明文を EMS 設定文脈に揃える。`lib/settingsProfiles.ts` の関連文言も同時に整える。

### 2. Live apply channel

`EmsDisplaySettingsForm` で `textSize` と `density` の draft 変更時にイベントを発火し、`useEmsDisplayProfile` がそれを購読して即時反映する。

### 3. Density-visible styling

`app/globals.css` で EMS 画面向けの密度差分を追加する。

- shell main の余白
- settings card の padding
- table header/body の padding
- control height

`comfortable` は広め、`compact` は詰め気味、`standard` は現状基準とする。

## Files

- Modify: `app/settings/page.tsx`
- Modify: `app/settings/display/page.tsx`
- Modify: `lib/settingsProfiles.ts`
- Modify: `components/settings/EmsDisplaySettingsForm.tsx`
- Modify: `components/ems/useEmsDisplayProfile.ts`
- Modify: `components/shared/PortalShellFrame.tsx`
- Modify: `components/settings/SettingCard.tsx`
- Modify: `components/settings/SettingLinkCard.tsx`
- Modify: `components/settings/SettingPageLayout.tsx`
- Modify: `components/settings/SettingsOverviewPage.tsx`
- Modify: `app/globals.css`
- Create: `components/ems/emsDisplayProfileEvents.ts`

## Testing

- `npm.cmd run lint`
- 手動確認: `/settings` の表示文言が正常であること
- 手動確認: `/settings/display` の slider 変更が即時反映されること
- 手動確認: `comfortable / standard / compact` で EMS 画面密度が変わること
