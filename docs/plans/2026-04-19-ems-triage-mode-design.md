# EMS トリアージモード設計

最終更新: 2026-04-19

## 結論

- 大規模災害時用のトリアージモードは、既存の `LIVE / TRAINING` を拡張せず、`EMS 専用の運用モード` として別レイヤで持つ。
- 初期導入は EMS 先行とし、ホームから即時切替できる quick toggle を追加する。
- データ分離を担う `currentMode` と、EMS 業務画面の表示・優先度を切り替える `triage mode` は責務を分離する。

## 前提と制約

- 現行の `currentMode = LIVE | TRAINING` は `cases`、`hospital_requests`、`notifications`、analytics のデータ分離そのものに使っている。
- ここへ第三値を足すと、`authContext`、mode filter、通知、集計、schema check、E2E 一式に広く波及する。
- 今回の要求は「大規模災害時用にトリアージモードを追加したい。ホームからすぐ切り替えたい」であり、まず必要なのは EMS 業務導線の切替である。
- EMS は tablet landscape 前提で、ホームで `first look -> compare -> act` を崩さない。

## 方式比較

### 1. `currentMode` に第三値 `TRIAGE` を追加する

- 長所: モード概念を一本化できる。
- 短所: 既存の LIVE / TRAINING データ分離と意味が混線する。全 role と通知・集計へ波及する。
- 判断: EMS 先行導入としては不採用。

### 2. `EMS 専用 user setting` として `triage mode` を持つ

- 長所: `TRAINING` と責務を分離できる。EMS 先行で局所導入しやすい。ホーム quick toggle と相性がよい。
- 短所: 将来 HOSPITAL / ADMIN へ広げる場合は別途共通化が必要。
- 判断: 採用。

### 3. URL query / localStorage だけで一時切替する

- 長所: 実装が軽い。
- 短所: 端末切替や再ログインで保持が不安定。業務モードとしては弱い。
- 判断: 不採用。

## 推奨設計

### 1. モデル

- `ems_user_settings` に `operational_mode` を追加する。
- 値は初期段階では `STANDARD | TRIAGE`。
- デフォルトは `STANDARD`。

責務分離:

- `currentMode`
  - `LIVE | TRAINING`
  - データの表示対象、通知対象、analytics 分離
- `operationalMode`
  - `STANDARD | TRIAGE`
  - EMS UI の優先度、警戒表示、導線短縮

### 2. EMS ホーム導線

- EMS ホーム hero に quick toggle を追加する。
- 候補 UI:
  - 左: 現在モード badge
  - 右: `通常運用` / `トリアージ` の 2 択 segmented control
- 保存は即時 PATCH とし、設定画面を経由しなくても切替できる。

ホーム上の反映:

- `TRIAGE` 中は hero 文言を災害対応向けに切り替える。
- quick links は通常の「統計」より、`新規事案作成`、`事案一覧`、`病院検索` を先頭固定で強調する。
- 本番 analytics は初期段階では残すが、表現は「通常傾向」ではなく「補助情報」へ格下げする。

### 3. EMS shell / detail の共通表示

- `TrainingModeBanner` と別に、EMS shell へ `TriageModeBanner` を追加する。
- `TRIAGE` 中は以下を共通表示する:
  - 常設バナー
  - header / hero の badge
  - 災害時簡易運用メッセージ

### 4. 初期導入の UI 変化

初期段階で入れるもの:

- EMS ホームからの quick toggle
- EMS settings に正式設定画面を追加
- EMS shell banner / badge
- EMS ホームの文言・quick links 優先度変更

初期段階で入れないもの:

- HOSPITAL / ADMIN への波及
- triage 専用 analytics
- triage 時の別 DB / 別一覧
- 事案フォーム項目の大規模変更
- 通知ルール変更

### 5. API / repository

- EMS settings 系に `operational_mode` の read / write を追加する。
- 追加候補:
  - `GET/PATCH /api/settings/ambulance/operational-mode`
- `getEmsHomeSettingsProfile()` のような専用 helper を作るより、既存 `emsSettingsRepository` へ寄せる。

### 6. 命名案

- DB / repository: `operationalMode`
- UI 表示: `トリアージモード`
- 値:
  - `STANDARD`
  - `TRIAGE`

理由:

- `triageMode: boolean` でも足りるが、今後 `DISASTER`, `MCI`, `DEGRADED` のような段階を増やす余地を残すため enum にする。

## 非目標

- `currentMode` の拡張
- EMS 以外への横展開
- triage 中の入力項目、検索条件、通知条件の全面改修
- 災害 BCP / 非常時アカウント運用の full 実装

## 影響ファイル

- `lib/emsSettingsSchema.ts`
- `lib/emsSettingsRepository.ts`
- `app/api/settings/ambulance/*`
- `components/home/HomeDashboard.tsx`
- `components/home/EmsHomePage.tsx`
- `components/ems/EmsPortalShell.tsx`
- `components/shared/*Banner*.tsx`
- `app/settings/page.tsx`
- `app/settings/mode/page.tsx` または EMS 専用新規設定ページ

## 検証方針

- `npm run check`
- EMS ホームの focused E2E 追加
  - ホームでトリアージ切替
  - banner / badge / quick links priority の反映
  - reload 後も保持

## 次の実装順

1. `operational_mode` の schema / repository foundation
2. EMS ホーム quick toggle
3. EMS shell banner
4. settings 画面への正式導線追加
5. focused E2E 追加
