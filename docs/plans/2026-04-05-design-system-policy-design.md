# デザインシステム方針書 初版

## 目的

- Atlassian Design System の思想を、このプロジェクトの業務 UI に合う形で移植する。
- 見た目の模倣ではなく、`Foundations / Components / Patterns / Tools` を含む運用ルールとして共通化する。
- EMS / HOSPITAL / ADMIN / DISPATCH の複数ロールをまたぐ画面で、一貫した判断性、可読性、状態理解、アクセシビリティを維持する。
- 既存実装を全破壊せず、段階的に token 化と共通化を進める。

## 1. 現状評価

### 1-1. 現状のUI/実装でバラつきそうな点

- `app/globals.css` に CSS 変数はあるが、色・余白・影・角丸・状態色が体系的な token にはまだ分かれていない。
- `rounded-2xl`、`border-slate-200`、`shadow-[...]`、`bg-white`、`text-slate-*` が各画面に直接書かれており、見た目の一貫性が class の反復に依存している。
- `EMS / HOSPITAL / ADMIN / DISPATCH` で shell は揃ってきているが、role 色、ボタン強調、カードトーン、見出しトーンに微妙な差がある。
- `RequestStatusBadge` は意味整理の中心になっている一方、状態色は badge の中に閉じており、テーブル行強調、通知、詳細ヘッダ、KPI との横断ルールまでは十分に共有されていない。
- dialog / modal / overlay は `ConfirmDialog`、`ConsultChatModal`、`DecisionReasonDialog`、個別 inline modal が混在しており、サイズ、余白、閉じ方、confirm 配置が揃い切っていない。
- フォーム部品は各 page / component に直接 Tailwind class が書かれているため、focus、disabled、error、read-only の挙動が将来的にずれやすい。
- テーブルは role ごとに良い実装があるが、dense table の列構成、row action の置き方、empty/loading/error の見せ方がパターン化し切っていない。

### 1-2. デザインシステム化すべき点

- Foundations:
  - color
  - spacing
  - typography
  - elevation
  - radius
  - motion
  - focus / interaction
- Components:
  - button
  - field controls
  - status badge
  - card
  - table
  - tabs
  - modal / drawer
  - toast / inline notice
  - empty / skeleton / loading
- Patterns:
  - 一覧
  - 詳細
  - 一覧 + 詳細
  - 状態遷移
  - 相談チャット
  - KPI + backlog
- Tools:
  - token 定義
  - 命名ルール
  - 実装ガイド
  - review checklist
  - accessibility checklist

### 1-3. 業務システムとして重要な点

- 白ベース高可読性を維持すること。
- 情報密度を下げすぎず、`first look -> compare -> act` の導線を守ること。
- 色は装飾ではなく意味で使うこと。
- 長文、欠損、異常値、ゼロ件、同時更新、競合時でも崩れないこと。
- モーダルやテーブルのような頻出 UI で、操作ルールと文言を揃えること。
- role が違っても、同じ概念は同じ見た目と挙動で認識できること。

## 2. 方針

### 2-1. このプロジェクトで採用するデザイン原則

- デザインシステムは「共通コンポーネント集」ではなく、`Foundations / Components / Patterns / Tools` をまとめた運用基盤として扱う。
- 画面設計は Atlassian 的な一貫性を参考にしつつ、このプロジェクトでは「業務判断の速さ」と「状態の即時理解」を最優先にする。
- 色、余白、タイポグラフィ、状態色、影、角丸、フォーカスは token 起点で整理する。
- role 差は shell の文脈や一部 accent に限定し、基本の情報設計と interaction は共有する。
- 一覧、詳細、モーダル、チャット、KPI などの頻出構成は pattern として明文化する。
- UI review は「美しさ」より「意味の一貫性」「誤読防止」「操作迷いの少なさ」で判断する。

### 2-2. 採用しないもの

- 派手なブランド演出や過剰な装飾。
- gradient 依存の視覚演出。
- role ごとに別プロダクトのように見える独立デザイン。
- arbitrary value の増殖による場当たり調整。
- 全画面を一斉に作り直す big bang 移行。
- token だけ先に増やして、使い方が定義されない抽象化。

### 2-3. 注意点

- Atlassian の思想は「一貫性」「意味の分離」「運用しやすい仕組み」を取り入れるのであって、配色やレイアウトの模写はしない。
- 現在の `docs/UI_RULES.md` は活かし、上位方針として再編する。
- EMS は tablet landscape、HOSPITAL / ADMIN / DISPATCH は PC 前提なので、完全な同型 UI は目指さない。
- token 導入は CSS 変数と semantic class の二層で始め、React component 抽象は必要箇所から増やす。

## 3. 具体ルール

### 3-1. 色

- 白をベース面、`slate` を情報面の標準色とする。
- 青は primary action と情報強調に限定する。
- 緑は成功 / 受入可能 / 搬送決定系に限定する。
- 赤は destructive / error / 受入不可 / 危険に限定する。
- amber は注意、未読、期限接近、保留に限定する。
- role 色は shell や section eyebrow の補助に限定し、状態色と混ぜない。

### 3-2. 文字

- ページタイトル、セクションタイトル、本文、補助情報、テーブル見出しの 5 階層に絞る。
- ラベルは短く、即時に意味が分かる日本語を優先する。
- 英語の装飾見出しは内部的な視覚ラベルに限定し、主要判断文言は日本語で統一する。

### 3-3. 余白

- 8px グリッドを維持する。
- ページ、section、card、field、action row の間隔を token 化する。
- 画面ごとの one-off 余白は減らし、`page / section / group / field / micro` の階層で整理する。

### 3-4. 状態表示

- 状態は color だけでなく、label と icon を併用する。
- `RequestStatusBadge` を中心に status semantic を統一する。
- 同じ状態は badge、table row emphasis、detail header、notification で同じ意味づけを保つ。

### 3-5. テーブル

- dense table を標準とする。
- header、row、action、empty、loading、error を共通仕様化する。
- テーブルは「比較」に使い、詳細や複雑な操作は inline expand、drawer、modal に逃がす。
- 横スクロールは最終手段とし、EMS では原則避ける。

### 3-6. フォーム

- input / select / textarea は共通 field style を持つ。
- focus ring、disabled、error、read-only、placeholder の挙動を標準化する。
- ラベル、補足、エラーの配置順を固定する。

### 3-7. モーダル

- dialog は「確認」「理由入力」「完了通知」など短い完結操作に限定する。
- 長い文脈や複数ステップは drawer / overlay panel を優先する。
- confirm / cancel の位置、close affordance、padding、max width、layer を標準化する。

### 3-8. タブ

- タブは対等な情報カテゴリの切り替えにだけ使う。
- 手順や状態遷移の代替として使わない。
- 頻度順、判断順で並べる。

### 3-9. 通知

- bell、toast、inline alert、table 内 warning を役割分担する。
- toast は短命な完了通知。
- inline alert は今の画面操作に関係する注意。
- global notification は role をまたぐ監視情報。

### 3-10. エラー表示

- field error は field 直下。
- section error は section 上部。
- blocking error は dialog / page level。
- recovery action を伴わない曖昧なエラー文言は避ける。

## 4. 実装案

### 4-1. ディレクトリ構成

```text
docs/
  UI_RULES.md
  plans/
    2026-04-05-design-system-policy-design.md

components/
  ui/
    button/
    field/
    badge/
    card/
    table/
    tabs/
    dialog/
    drawer/
    empty/
    feedback/
  shared/
  ems/
  hospitals/
  admin/
  dispatch/

lib/
  designSystem/
    tokens.ts
    statusTokens.ts
    patterns.ts
```

### 4-2. token 定義ファイル案

- `app/globals.css`
  - CSS custom properties の正本
- `lib/designSystem/tokens.ts`
  - token 名の TypeScript 参照と export
- `lib/designSystem/statusTokens.ts`
  - status -> label / icon / tone の正本

### 4-3. 共通コンポーネント構成案

- `components/ui/button/AppButton.tsx`
- `components/ui/field/TextField.tsx`
- `components/ui/field/SelectField.tsx`
- `components/ui/field/TextareaField.tsx`
- `components/ui/badge/StatusBadge.tsx`
- `components/ui/card/SurfaceCard.tsx`
- `components/ui/table/DataTable.tsx`
- `components/ui/tabs/AppTabs.tsx`
- `components/ui/dialog/AppDialog.tsx`
- `components/ui/drawer/OverlayPanel.tsx`
- `components/ui/feedback/InlineNotice.tsx`
- `components/ui/feedback/EmptyState.tsx`
- `components/ui/feedback/Skeleton.tsx`

### 4-4. 命名ルール

- token:
  - `--ds-color-*`
  - `--ds-space-*`
  - `--ds-radius-*`
  - `--ds-shadow-*`
  - `--ds-font-size-*`
  - `--ds-line-height-*`
- semantic token:
  - `--ds-surface-default`
  - `--ds-text-subtle`
  - `--ds-border-default`
  - `--ds-status-success-bg`
- component:
  - `AppButton`
  - `StatusBadge`
  - `DataTable`
  - `OverlayPanel`
- pattern:
  - `ListDetailLayout`
  - `StatusTimeline`
  - `KpiSection`

## 5. 移行計画

### Phase 1

- `docs/UI_RULES.md` をこの方針に沿って再編する。
- 既存 CSS 変数を `ds token` へ整理する。
- `Button / Field / StatusBadge / Dialog / Card / Loading` の最小共通部品を定義する。
- `RequestStatusBadge`、`ConfirmDialog`、`SettingActionButton`、loading 群を token ベースへ寄せる。

### Phase 2

- テーブル、一覧 + 詳細、相談チャット、通知、tab の pattern を共通化する。
- `EMS / HOSPITAL / ADMIN / DISPATCH` で同じ意味の UI を揃える。
- role 別 shell の spacing / header / section / action 配置を token ベースで揃える。

### Phase 3

- KPI ダッシュボード、検索結果、詳細 panel、settings を pattern 単位で移行する。
- review checklist と accessibility checklist を docs 化する。
- 新規画面追加時に design token と pattern を必須前提とする。

## 推奨結論

- このプロジェクトは、Atlassian Design System の思想を十分移植可能である。
- ただし「見た目を Atlassian に寄せる」のではなく、「意味が一貫し、追加画面でも破綻しない運用ルール」を導入する形が適切。
- 現在のコードベースには `PortalShellFrame`、`AdminWorkbench`、`RequestStatusBadge`、loading 群、`globals.css` 変数など、移行の土台が既にある。
- よって、最初の一歩は新規 UI の全面刷新ではなく、`token 再整理 -> 基本 component 共通化 -> pattern 文書化 -> 主要画面の段階移行` が妥当。
