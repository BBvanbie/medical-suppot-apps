# UIルール

最終更新: 2026-04-05

このドキュメントは、このプロジェクトで画面設計と UI 実装を行うときの共通ルールを定義する。
ここでいう design system は、単なるコンポーネント集ではなく、`Foundations / Components / Patterns / Tools` を含む運用ルールとして扱う。
見た目の派手さより、可読性、即時判断性、一貫性、アクセシビリティ、拡張時の破綻しにくさを優先する。

## 1. Design Principles

### 1-1. 基本方針

- UI は「最初に見るもの」「比較するもの」「最後に行動するもの」を明確にする。
- 画面は `first look -> compare -> act` の流れで構成する。
- 情報量は多くてよいが、視線導線を整理する。
- 白ベース高可読性を維持し、色は意味のある箇所だけに使う。
- 長文、欠損、異常値、ゼロ件、重複、同時更新でも破綻しにくい UI を優先する。
- role ごとに業務文脈は違っても、同じ概念は同じ見た目と挙動で理解できるようにする。

### 1-2. 採用するもの

- `Foundations / Components / Patterns / Tools` で整理された design system 的運用
- 8px グリッド
- 白ベース、高情報密度、高可読性
- semantic token による色、余白、状態、フォーカスの管理
- role 差を shell と文脈に限定し、基本挙動は共有する設計
- 一覧、詳細、オーバーレイ、状態遷移、相談履歴の pattern 化

### 1-3. 採用しないもの

- gradient や装飾依存の UI
- role ごとに別プロダクトのように見える独立デザイン
- arbitrary value の乱用
- generic SaaS テンプレートのような均一カード並べ
- 色だけに依存した状態表現
- 全画面の一斉刷新を前提にした big bang 移行

### 1-4. Role / Device 前提

- EMS:
  - iPad 横固定前提
  - 横スクロールは原則避ける
  - 一覧比較と即時操作を優先する
- HOSPITAL / ADMIN / DISPATCH:
  - PC 前提
  - EMS より高密度を許容する
  - dense table と side summary を標準候補にする

## 2. Foundations

### 2-1. Color

- 白をベース面、`slate` を中立情報色の基準にする。
- 青は primary action と情報強調だけに使う。
- 緑は成功、受入可能、搬送決定だけに使う。
- 赤は destructive、error、受入不可、危険だけに使う。
- amber は未読、注意、期限接近、保留に限定する。
- role 色は shell や section eyebrow などの補助に限定し、状態色と混ぜない。

#### 色の運用ルール

- ブランド色、操作色、状態色、注意色を分離する。
- 同じ青を主ボタン、情報ラベル、警告、リンクの全役割で使い回さない。
- 強い背景色を広く塗らず、`subtle background + targeted accent` を基本にする。
- 状態表現は色だけでなく文言と icon を併用する。

#### token の基本方針

- 色は固定値ではなく semantic token で参照する。
- 例:
  - `--ds-surface-default`
  - `--ds-surface-subtle`
  - `--ds-text-default`
  - `--ds-text-subtle`
  - `--ds-border-default`
  - `--ds-status-success-bg`
  - `--ds-status-warning-fg`
  - `--ds-focus-ring`

### 2-2. Spacing

- 基本単位は `8px` とする。
- 優先スケールは `8 / 16 / 24 / 32 / 40 / 48 / 64`。
- `4px` は badge 内部や微調整など限定用途だけで使う。
- page、section、card、group、field、micro の階層で spacing を分ける。
- 同じ階層では同じ余白を使う。

### 2-3. Typography

- タイポグラフィは 5 階層に絞る。
  - page title
  - section title
  - body / form / table body
  - meta / support
  - status / micro label
- ページタイトルは `text-2xl font-bold` 相当を基準にする。
- セクションタイトルは `text-lg font-bold` 相当を基準にする。
- 本文、フォーム、テーブル本文は `text-sm` を基準にする。
- 補助情報は `text-xs text-slate-500` を基準にする。
- 主要判断文言は日本語で短く明快に書く。

### 2-4. Elevation

- 影は常用しない。
- 面の切り替えは、まず背景差、余白差、文字差で作る。
- elevation は overlay、important surface、sticky action など限定用途にする。
- 大きい shadow を多用して hierarchy を作らない。

### 2-5. Border Radius

- 基本 radius は `rounded-2xl` を継続基準にする。
- 小要素は 1 段低い radius を使ってよいが、画面内で乱立させない。
- radius は形の個性ではなく、surface hierarchy の一貫性に使う。

### 2-6. Icon Usage

- icon は補助情報として使い、ラベルの代替にしない。
- status、warning、action affordance には有効だが、装飾目的では増やさない。
- icon-only button には必ず accessible name を付ける。
- 同じ意味の操作には同じ icon を使う。

### 2-7. Motion

- motion は意味がある場面だけに使う。
- page-load、overlay open/close、status change の補助に限定する。
- reduced motion を尊重する。
- transform / opacity ベースを優先し、layout shift を避ける。

### 2-8. Focus / Accessibility

- focus state は必ず可視化する。
- color だけで状態を伝えない。
- touch target は EMS tablet 前提で十分な大きさを確保する。
- keyboard 操作順は視線順から大きく外さない。
- エラーは問題の近くに表示する。

## 3. Components

### 3-1. Button

- primary action は 1 画面 1 主役を原則にする。
- primary button は semantic primary tone を使う。
- secondary button は白背景 + 中立 border を基準にする。
- destructive action は通常操作と明確に分離する。
- loading button は二重送信を防ぐ。

### 3-2. Input / Select / Textarea

- field control は共通 style を使う。
- focus、disabled、error、read-only、placeholder の挙動を標準化する。
- ラベル、補足、エラーの順序を固定する。
- 入力の成否と編集可否が即時に分かるようにする。

### 3-3. Badge / Status Chip

- status badge は状態表現の正本にする。
- 同じ状態は badge、table row emphasis、detail header、notification で同じ意味を保つ。
- 色だけでなく文言と必要な icon を併用する。

### 3-4. Table

- dense table を標準とする。
- table は比較に使い、複雑な詳細や長い操作は expand、drawer、dialog に逃がす。
- header、row、action、empty、loading、error の仕様を揃える。
- 長文でも崩れにくい cell 構成を優先する。

### 3-5. Tabs

- タブは対等な情報カテゴリの切り替えだけに使う。
- 手順や状態遷移の代替として使わない。
- 並び順は利用頻度か判断順を優先する。

### 3-6. Modal / Dialog

- dialog は短い完結操作に使う。
  - 確認
  - 理由入力
  - 完了通知
- close affordance、cancel / confirm 配置、padding、max width を標準化する。
- 長い文脈や複数ステップは drawer / overlay panel を優先する。

### 3-7. Drawer / Overlay Panel

- 関連詳細を一覧と切り離しすぎずに見せるために使う。
- 一覧 + 詳細の 2 ペインがきつい画面では overlay panel を選ぶ。
- modal より長い文脈を扱う用途に限定する。

### 3-8. Toast / Notification

- toast は短命な完了通知だけに使う。
- inline notice は今の画面操作に関係する注意や制約に使う。
- global notification は role をまたぐ監視情報に使う。
- 同じ内容を bell、toast、inline alert に重複表示しない。

### 3-9. Card

- card は整理のために増やさない。
- section 単位で大きい面を作り、内部で密度を上げる設計を優先する。
- 外枠、内枠、小要素枠が三重以上に続く状態を避ける。

### 3-10. Empty / Skeleton / Loading

- loading、empty、error は通常状態と同等に設計する。
- skeleton は最終レイアウトを想起できる形にする。
- empty state では「何もない」だけで終わらず、次の行動が分かるようにする。

## 4. Patterns

### 4-1. 一覧ページ

- 最上段で backlog、優先状態、次の操作が把握できるようにする。
- 検索、絞り込み、状態比較、行動導線を近接配置する。
- KPI を置く場合も、必ず actionable な一覧や alert と組み合わせる。

### 4-2. 詳細ページ

- summary、status、履歴、次アクションを分離しすぎない。
- 患者概要、選定履歴、相談履歴、操作導線の順序は判断順で決める。
- 重要 status と blocking note は first look に入れる。

### 4-3. 一覧 + 詳細

- PC では 2 ペインを優先候補にする。
- EMS では 1 画面完結を優先し、必要なら inline expand や overlay で補う。
- 行選択と詳細表示の関係は明確にする。

### 4-4. 病院検索結果表示

- 比較しやすさを最優先にする。
- スコア、理由、距離、診療科、状態、次操作を近接配置する。
- table だけで苦しいときは 2 段 cell や expand を使う。

### 4-5. ステータス遷移表示

- 現在状態、到達済み状態、次に可能な操作を混同させない。
- 色だけでなくラベル、履歴、補助文で意味を示す。
- 終端状態では不要な CTA を残さない。

### 4-6. 相談チャット / コメント履歴

- 時系列、発言者、状態遷移イベントを読み分けやすくする。
- 会話と操作を混在させすぎない。
- 長文、空白、未返信、既読差を前提にする。

### 4-7. KPI ダッシュボード

- KPI card を並べるだけで終わらせない。
- pending、stalled、遅延 actor、未対応一覧と組み合わせる。
- chart より一覧や分布の方が行動に結びつくなら、そちらを優先する。

## 5. Tools / Implementation Rules

### 5-1. Token

- token は CSS custom properties を正本にする。
- 色、余白、radius、shadow、font size、line height、focus ring、status tone を token 化する。
- token 名は semantic を優先し、実値や色名に寄りすぎない。
- 推奨 prefix:
  - `--ds-color-*`
  - `--ds-space-*`
  - `--ds-radius-*`
  - `--ds-shadow-*`
  - `--ds-font-size-*`
  - `--ds-line-height-*`
  - `--ds-focus-*`
  - `--ds-status-*`

### 5-2. Reuse Policy

- 新規 component を作る前に既存 shell、card、table、dialog、badge、loading を確認する。
- visual wrapper だけの抽象化は避ける。
- 共通化は role をまたぐ意味単位で行う。
- まず Foundations と primitive を揃え、その後 pattern に広げる。

### 5-3. State Checklist

- loading
- empty
- error
- disabled
- read-only
- permission-limited
- stale / conflict
- unusually long text
- missing data
- duplicate / abnormal values

各 state で確認すること:

- 文言が曖昧すぎないか
- 次の行動が分かるか
- レイアウトが崩れないか
- 不要な CTA が残っていないか

### 5-4. Table / Overlay Decision Rule

- 比較が主目的なら table
- 一時確認や短い決定なら dialog
- 長い文脈の詳細や複数要素確認なら drawer / overlay
- 常時並べて見比べる必要があるなら 2 ペイン

### 5-5. Copy Rule

- ラベルは短く、意味が即時に伝わる日本語を使う。
- 見出しのための英語装飾を主要文言に使わない。
- 曖昧なエラー文言を避け、可能なら回復行動を書く。

### 5-6. Accessibility Rule

- コントラストは白ベースで十分に確保する。
- focus ring を hidden にしない。
- icon-only button に accessible name を付ける。
- status と warning を色だけで示さない。

### 5-7. Encoding Rule

- `app/`、`components/`、`docs/` の UI 文言ファイルは UTF-8 を維持する。
- 文字化けを検知したら、レイアウト調整より先に修復する。
- 日本語 UI 文言、通知文言、docs は部分編集を優先し、全体再生成を避ける。

## 6. Review Checklist

- 主役情報、比較対象、最終行動が明確か
- 8px グリッドから大きく外れていないか
- 色の役割が既存 token と衝突していないか
- 状態色の意味が role をまたいで一致しているか
- loading / empty / error / read-only / conflict を落としていないか
- EMS で横スクロール前提になっていないか
- HOSPITAL / ADMIN / DISPATCH で密度不足になっていないか
- 日本語文言が短く明快か
- 長文、欠損、異常値でも破綻しないか
