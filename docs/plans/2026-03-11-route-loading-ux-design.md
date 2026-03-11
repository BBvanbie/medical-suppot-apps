# Screen Transition Loading Design

**Date:** 2026-03-11

## Goal

medical-support-apps の画面遷移と送信操作に、ページ種別に応じたローディング表現を追加し、真っ白画面・二重送信・状態不明の操作感をなくす。

## Scope

- App Router の `loading.tsx` を EMS / HOSPITAL / ADMIN の主要ルートへ追加する
- 共通ローディング primitive とページ種別 skeleton を追加する
- 重要操作の送信ボタンを共通 pending UI に寄せる
- 必要な場面だけ薄い全画面オーバーレイを使う
- 既存の shell / sidebar / role gating は維持する

## Non-Goals

- すべてのボタンを今回一括で共通化しない
- 既存の検索ロジックや業務フローを変更しない
- 重い外部ライブラリを導入しない

## Current State

- `loading.tsx` はほぼ未整備で、遷移時に白画面になりやすい
- 送信系 pending は各コンポーネントに分散しており、見た目と文言が揃っていない
- shell は `PortalShellFrame` / `EmsPortalShell` / `HospitalPortalShell` / `AdminPortalShell` で分かれているため、layout は残したまま page 部分だけ loading に差し替える構成と相性が良い

## Approach Options

### Option 1: Shared primitives + typed page skeletons + staged action loading

共通 primitive を追加し、`loading.tsx` からページ種別 skeleton を呼ぶ。送信系は重要操作だけ `LoadingButton` と `PendingOverlay` に寄せる。

- 利点: 影響範囲を抑えつつ体感品質を大きく改善できる
- 利点: loading.tsx と既存 shell 構成に自然に沿う
- 利点: 段階導入しやすく、既存 pending state を流用できる
- 欠点: 軽微な補助操作ボタンは見た目が完全統一されない

### Option 2: Full loading/pending rewrite

すべての送信ボタンと遷移表現を新しい共通コンポーネントへ統一する。

- 利点: UI 一貫性は最も高い
- 欠点: 回帰リスクが高く、今回の対象画面数に対して重い

### Option 3: Route loading only

`loading.tsx` だけ先に整備し、送信系 pending は既存のまま残す。

- 利点: 実装コストが低い
- 欠点: 送信中 UX と二重送信防止の統一が弱い

## Recommendation

Option 1 を採用する。App Router の標準に沿い、ルート遷移は `loading.tsx`、送信系は client pending で責務を分離する。これにより shell を壊さず、一覧・詳細・設定・診療情報で形の分かる loading を短期間で揃えられる。

## Architecture

### 1. Shared loading primitives

`components/shared/loading/` を追加し、以下を定義する。

- `SkeletonBlock`
- `SkeletonLine`
- `SkeletonCircle`
- `InlineSpinner`
- `LoadingLabel`
- `LoadingButton`
- `PendingOverlay`
- `PageLoadingOverlay`

方針:
- Tailwind だけで実装する
- 白基調の業務アプリに合う淡いグレー中心にする
- 点滅の強いアニメーションは避け、`animate-pulse` と軽い spinner に留める

### 2. Page-type skeletons

同ディレクトリにページ種別 skeleton を追加する。

- `DashboardPageSkeleton`
- `ListPageSkeleton`
- `DetailPageSkeleton`
- `SettingsPageSkeleton`
- `MedicalInfoGridSkeleton`

方針:
- `loading.tsx` 側は薄い composition にする
- 各 skeleton は title / toolbar / content rows / cards などの slot を props で少し変えられるようにする
- 完全な個別実装ではなく、ページ種別ごとの見た目差だけを表現する

### 3. Route loading placement

対象の App Router セグメントに `loading.tsx` を置く。layout はそのままにし、page content 部分だけ skeleton 化する。

- dashboard: `/paramedics`, `/hospitals`, `/admin`
- list: `/cases/search`, `/hospitals/requests`, `/hospitals/patients`, `/hospitals/consults`, `/hospitals/declined`, `/admin/* list pages`
- detail: `/cases/[caseId]`, `/hospitals/requests/[targetId]`, `/hospitals/patients/[targetId]`
- settings: `/settings/*`, `/hp/settings/*`, `/admin/settings`
- medical info: `/hospitals/medical-info`

### 4. Action loading and double-submit prevention

仕様書の重要操作を優先して `LoadingButton` 化する。

対象:
- 受入要請送信
- 相談コメント送信
- 病院ステータス更新
- EMS 搬送決定
- EMS 搬送辞退
- 診療情報カード切替
- 設定保存
- 管理者の重要更新操作

方針:
- 既存の `sending` / `isPending` / `saveState` を温存しつつ、見た目だけ `LoadingButton` に寄せる
- 重い遷移のみ `PendingOverlay` をフォームやページに重ねる
- 失敗時は pending を解除し、既存 toast / error 表示をそのまま使う

### 5. Overlay policy

`PendingOverlay` / `PageLoadingOverlay` は以下だけに使う。

- 送信後にページまたぎの重要遷移が発生する操作
- 二重操作防止が必要な重い更新

一覧取得や軽いトグル操作では使わず、ボタン loading と局所 skeleton で済ませる。

## Data / Control Flow

### Route loading

1. ユーザーが対象 route に遷移する
2. App Router が `loading.tsx` を即時表示する
3. shell / sidebar は layout 側に残る
4. server component の page が解決したら実 UI に置き換わる

### Action loading

1. client component でクリック
2. pending state を true にしてボタン disable
3. 必要なら局所 overlay を表示
4. route handler / server action 完了
5. 成功時は toast / refresh / navigate
6. 失敗時は pending false + error 表示

## File Plan

### New shared components

- `components/shared/loading/SkeletonBlock.tsx`
- `components/shared/loading/SkeletonLine.tsx`
- `components/shared/loading/SkeletonCircle.tsx`
- `components/shared/loading/InlineSpinner.tsx`
- `components/shared/loading/LoadingLabel.tsx`
- `components/shared/loading/LoadingButton.tsx`
- `components/shared/loading/PendingOverlay.tsx`
- `components/shared/loading/PageLoadingOverlay.tsx`
- `components/shared/loading/DashboardPageSkeleton.tsx`
- `components/shared/loading/ListPageSkeleton.tsx`
- `components/shared/loading/DetailPageSkeleton.tsx`
- `components/shared/loading/SettingsPageSkeleton.tsx`
- `components/shared/loading/MedicalInfoGridSkeleton.tsx`
- `components/shared/loading/index.ts`

### Route loading files

追加対象は仕様書の列挙どおり。内部実装は skeleton の再利用を優先する。

### Existing client components to update first

- `components/shared/ConsultChatModal.tsx`
- `components/shared/DecisionReasonDialog.tsx`
- `components/cases/CaseFormPage.tsx`
- `components/hospitals/HospitalRequestsTable.tsx`
- `components/hospitals/HospitalRequestDetail.tsx`
- `components/hospitals/HospitalConsultCasesTable.tsx`
- `components/hospitals/HospitalMedicalInfoPage.tsx`
- `components/settings/*SettingsForm.tsx`
- `components/admin/AdminEntityEditor.tsx`
- `components/admin/AdminEntityCreateForm.tsx`

## Error Handling

- `loading.tsx` はエラーを握りつぶさない。既存 `error.tsx` / 例外伝播に任せる
- action pending は API 失敗時に必ず解除する
- optimistic toggle を使う診療情報カードは保存失敗時にロールバックする
- overlay 使用時も toast やインラインエラーの可視性を妨げない

## Testing Strategy

### Static verification

- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- `npm.cmd run build`

### Targeted regression checks

- EMS / HOSPITAL / ADMIN の主要 route に遷移して shell を残したまま skeleton が出る
- 詳細ページで構造の分かる skeleton が出る
- 診療情報ページでカードグリッド skeleton が出る
- 重要操作ボタンで二重送信できない
- 診療情報カード toggle は pending 中に連打できない

### E2E follow-up

必要なら Playwright で 1 本、代表遷移と送信 pending を確認する。ただし今回は UI 実装を優先し、E2E は最小限に留める。

## Risks and Mitigations

- 対象 route 数が多い
  - 共通 skeleton を使い回し、`loading.tsx` を薄く保つ
- 既存 pending 実装との二重管理
  - state は既存を再利用し、見た目だけ共通部品に置換する
- overlay の乱用
  - 仕様上の重い遷移に限定し、一覧取得には使わない
- shell を消してしまう実装ミス
  - layout は触らず page セグメント配下の `loading.tsx` だけで対応する

## Success Criteria

- 主要遷移で真っ白画面が出ない
- 一覧 / 詳細 / 設定 / 診療情報がそれぞれ形の分かる loading になる
- 重要操作でボタン pending と二重送信防止が揃う
- 既存の role layout と業務フローを壊さない
