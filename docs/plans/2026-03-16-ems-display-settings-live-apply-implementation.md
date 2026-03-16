# EMS Display Settings Live Apply Implementation Plan

**Goal:** EMS 表示設定の変更を保存前でも即時反映し、密度と文字サイズの確認をしやすくする。

**Architecture:** 設定フォームの draft 変更をイベントで通知し、EMS 側 profile hook と CSS 変数で UI に反映する。

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, ESLint

---

### Task 1: Repair EMS settings copy

**Files:**
- Modify: `app/settings/page.tsx`
- Modify: `app/settings/display/page.tsx`
- Modify: `lib/settingsProfiles.ts`

**Step 1: Replace corrupted Japanese strings with valid UTF-8 copy**

期待結果:

- EMS 設定画面の主要文言が正常表示される
- settings profile fallback 文言も正常化される

**Step 2: Normalize English-heavy labels around display settings**

期待結果:

- `EMS SETTINGS` や `DISPLAY` 周辺の表現が画面全体と揃う

### Task 2: Add live apply channel for EMS display settings

**Files:**
- Create: `components/ems/emsDisplayProfileEvents.ts`
- Modify: `components/settings/EmsDisplaySettingsForm.tsx`
- Modify: `components/ems/useEmsDisplayProfile.ts`

**Step 1: Define a client event helper**

期待結果:

- 表示設定変更を dispatch する helper ができる

**Step 2: Emit draft settings on slider change**

期待結果:

- `textSize` / `density` の draft 更新時にイベントが飛ぶ
- 保存前でも見た目が追従する

**Step 3: Subscribe in the EMS display profile hook**

期待結果:

- custom event を hook が受け取り settings state を更新する
- 既存 fetch ロジックを壊さない

### Task 3: Make density visibly affect layout

**Files:**
- Modify: `components/shared/PortalShellFrame.tsx`
- Modify: `components/settings/SettingCard.tsx`
- Modify: `components/settings/SettingLinkCard.tsx`
- Modify: `components/settings/SettingPageLayout.tsx`
- Modify: `components/settings/SettingsOverviewPage.tsx`
- Modify: `app/globals.css`

**Step 1: Route shell padding through CSS variables**

期待結果:

- shell main padding が CSS 変数経由になる

**Step 2: Mark settings cards/panels as density-aware**

期待結果:

- settings header/card/summary/link card が密度反映対象になる

**Step 3: Add `data-ems-density` variable sets**

期待結果:

- `comfortable` と `compact` の差分が明確になる
- table cell padding と control height も追従する

### Task 4: Verify

**Files:**
- Modify: all touched files above

**Step 1: Run lint**

Run: `npm.cmd run lint`

Expected: PASS

**Step 2: Review diff for scope control**

確認事項:

- 変更が EMS 表示設定まわりに閉じていること
- API や DB へ不要な影響がないこと
