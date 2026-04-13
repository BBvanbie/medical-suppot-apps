---
name: frontend-ui
description: 既存の Next.js / React UI パターン、`docs/UI_RULES.md`、Portal 系コンポーネントを確認したうえで、このリポジトリ向けの高密度で運用実務に耐える UI を実装・改善するための主力 skill。見た目調整だけでなく、情報設計、状態表示、導線、端末前提、アクセシビリティ、密度設計、React/Next/Tailwind 実装方針を含めて扱う。
---

# frontend-ui

## purpose

- このリポジトリの UI を、generic な SaaS 画面ではなく、現場運用に耐える高密度で洗練された画面として実装する。
- 見た目だけを整えるのではなく、情報量、比較しやすさ、操作速度、状態の明快さを同時に改善する。
- global の React / Next.js / design guidance は補助知識として使い、この repo の現場前提に合う形に落とし込む。

## use this skill when

- `app/` や `components/` の UI を追加・変更するとき
- フォーム、テーブル、ダイアログ、タブ、フィルタ、一覧、ダッシュボードを改善するとき
- EMS / HOSPITAL / ADMIN / DISPATCH の画面密度、レイアウト、情報階層、操作導線を見直すとき
- loading / empty / error / disabled / read-only / conflict 状態を UI に反映するとき
- UI 実装時に React / Next.js / Tailwind の global skill を補助参照したいとき

## do not use this skill when

- 主目的が API、DB、認可、セキュリティの変更であるとき
- docs のみを更新するとき
- 実質的に review-only のとき

## routing rule

- この skill は、この repository の UI 作業における primary skill である。
- `react-best-practices`、`next-best-practices`、`tailwind-design-system`、`web-design-guidelines`、必要なら `frontend-design` / `ui-ux-pro-max` の良い部分は補助参照してよい。
- ただし最終判断は必ずこの skill と `AGENTS.md`、既存 UI 実装、`docs/UI_RULES.md` に合わせる。
- global skill をそのまま当てはめず、この repo の端末前提と運用密度へ変換して使う。

## first principles

### 1. AIっぽい量産 UI を避ける

- generic なカード並べ、均等グリッド、過剰な border、過剰な shadow、紫系の無難配色に逃げない
- 「整理した感」を border の数で作らず、面の切り替え、余白、タイポグラフィ、整列で見せる
- 余計な枠線は増やさない
- 情報量が多くても雑然と見せず、主従関係を明確にする

### 2. 斬新さより奇抜さを避けた洗練

- 目新しさは layout、情報の置き方、余白の使い方、密度の制御、色の役割分離で出す
- 装飾を増やして novelty を出さない
- 現場画面として信用を落とす派手さは避ける
- 「印象的」と「業務向け」の両立を狙う

### 3. 情報設計は `first look -> compare -> act`

- first look:
  - 今見るべき状態、危険、優先度が一瞬で分かる
- compare:
  - 候補、状態差、指標差を同じ視線で比較できる
- act:
  - 次に押すべき操作が自然に近い位置にある

### 4. 密度は役割ごとに最適化する

- EMS:
  - tablet 横画面固定前提
  - 情報量は多め
  - 文字サイズは比較的小さめでよい
  - 一覧比較、即判断、短い操作動線を優先する
  - 横スクロールは基本なし
- HOSPITAL / ADMIN / DISPATCH:
  - PC 前提
  - EMS よりさらに高密度を許容する
  - 複数列や詳細メタ情報を表示してよい
  - 監視、比較、一覧管理、追跡可能性を優先する

### 5. 運用 UI は「広く・薄く」より「必要情報を近接」

- 重要情報は近接配置する
- 一覧と詳細を遠くに分断しすぎない
- summary と action を切り離しすぎない
- 横並びできる関係情報は、必要なら同じ行や隣接 panel に置く
- 上部固定や上部常設の hero / toolbar は縦方向を食いすぎない
- 独立スクロール領域を持つ画面では、header の余白、title margin、補助 panel の高さを compact density に寄せる

## visual direction

### typography

- generic font stack に逃げない
- ただしこの repo では新規 font 導入より、weight、size、tracking、line-height の制御を優先する
- primary heading、section heading、dense table meta の階層差を明確にする
- secondary meta は 11px-13px 相当を許容する
- 情報量が多い画面でも、最重要値だけは一段強くする

### color

- 色は装飾ではなく役割で使う
- brand、action、status、warning、critical を混ぜない
- 同じ tone を全面に塗らない
- subtle background layer + targeted accent を基本にする
- light mode 偏重 / dark mode 偏重ではなく、現場の可読性を優先する

### borders, rings, shadows

- border を増やして整理しない
- ring は必要最小限
- shadow は情報階層の補助として使い、常用しない
- 背景差、余白差、文字の太さ差、alignment 差で hierarchy を出す

### motion

- motion は意味がある場面だけに使う
- 高インパクトな page-load / reveal / state change を少数入れる方が良い
- scattered な小ネタ animation を乱発しない
- reduced motion を尊重する
- transform / opacity ベースを優先し、layout shift を起こす animation は避ける

## layout guidance

### EMS

- tablet landscape を前提に、主コンテンツは 2 列または 3 列までを基本とする
- フォームは縦に長く伸ばすより、related group を横に並べて視線移動を減らす
- 一覧は compact row を許容する
- table の列は多くてよいが、重要列を左に寄せ、右端に action を詰める
- alert、status、next action は上段で短く見せる
- 1 画面内で「現況」「比較」「操作」が完結する構成を優先する

### HOSPITAL / ADMIN / DISPATCH

- desktop を前提に、比較対象は複数 panel で同時表示してよい
- dense table + side summary は有力な基本形
- cards の乱立より、section 単位で大きく面を作って内部で密度を上げる
- 「概要カードを 4 枚並べるだけ」で終わらせない
- monitor 面では KPI より pending / alert / slow actor / backlog の具体一覧を重視する
- 一覧の default は card list とし、table は比較軸が多く整列自体に意味がある場面だけに使う

## horizontal scroll policy

- 横スクロールは原則避ける
- 特に EMS では禁止に近い前提で考える
- table が苦しい場合は以下を優先する
  - 列の優先順位を落とす
  - 1 cell を 2 段構成にする
  - summary 行 + detail 行に分ける
  - action 列を圧縮する
  - details drawer / inline expand を使う
- 「列を全部残したいから横スクロール」は最後の手段

## dashboard and table guidance

- dashboard は KPI card を並べるだけで終わらせない
- KPI の下に、比較可能な分布、一覧、pending、alerts を置く
- 行動に結びつかない KPI は増やさない
- chart より一覧・分布・優先順位表示が適切なら、そちらを優先する
- 一覧はまず `1 item = 1 card` で構成できるかを考える
- card の上段には主役情報、下段には補助メタ、右端には最小限の action を置く
- table は 1 行 1 意味を崩さない
- dense table では label / value / status / action の役割差をはっきり出す

## component guidance

- `PortalShell` 系、analytics sections、shared card/table/dialog を優先再利用する
- 新規 component は、再利用される役割単位で切る
- visual wrapper だけの抽象化は避ける
- state 表示は component 側で隠しすぎず、呼び出し元で意味が追えるようにする

## state checklist

- loading
- empty
- error
- disabled
- read-only
- conflict / stale
- permission-limited
- unusually long text
- missing data
- duplicate or abnormal values

各 state で確認すること:

- message が曖昧すぎないか
- next action が分かるか
- レイアウトが崩れないか
- 主要 CTA が不適切に残っていないか

## accessibility and interaction minimums

- focus state を必ず見えるようにする
- icon-only button には accessible name を付ける
- keyboard 操作順が視線順と大きくズレないようにする
- loading button は二重送信を防ぐ
- エラーは問題の近くに出す
- color だけで status を表現しない
- touch target は EMS tablet 前提で十分な大きさを確保する

## React / Next.js implementation guidance

- 既存 repo の React / Next.js パターンを優先する
- async data は independent なら並列化を優先する
- client / server boundary を曖昧にしない
- props は必要最小限に保つ
- hydration mismatch を起こしやすい書き方を避ける
- interaction が重い更新は non-urgent 化を検討する
- UI 改修で bundle を大きくしすぎない

## Tailwind / design token guidance

- semantic class / semantic utility の方向を優先する
- arbitrary value は必要最小限
- spacing と size は既存スケールに合わせる
- one-off visual trick より、再利用できる token / pattern を優先する
- ただし、この repo では design system 抽象のための抽象化はやりすぎない

## workflow

1. 近い画面と再利用可能な既存 component / shell / section を確認する。
2. 利用者、端末、作業文脈、最重要アクションを確定する。
3. この画面で「何を一番上に置くか」「何を比較させるか」「どこで操作させるか」を決める。
4. 通常、空、読み込み中、保存中、エラー、disabled、read-only、競合時を設計に含める。
5. 必要なら global skill の relevant 部分を補助参照する。
6. 既存の PortalShell、cards、tables、filters、dialogs を再利用しながら局所的に改良する。
7. 最後に tablet / desktop 前提で密度、可読性、横スクロール有無を見直す。

## implementation checklist

- 近い既存画面と UI vocabulary を揃えたか
- 端末前提に合う情報密度か
- 横スクロールなしで成立しているか
- 固定ヘッダー系画面で、下部の作業領域を不必要に圧迫していないか
- border に頼らず hierarchy を作れているか
- action が読了後の自然な位置にあるか
- alert / warning / pending が first look で見えるか
- Japanese UI 文言が既存用語と一致しているか
- loading / empty / error / read-only / conflict を見落としていないか

## output format

- 変更概要
- 情報設計の判断
- 主要 UI 変更点
- 状態別考慮
- 検証項目

## project-specific notes

- `docs/UI_RULES.md` を必ず確認する
- EMS は tablet landscape 固定前提で考える
- HOSPITAL / ADMIN / DISPATCH は PC 前提で EMS より高密度を許容する
- 日本語 UI 文言と文字化けリスクを常に意識する
- AI っぽい箱感を避け、余計な枠線を増やさない
- この repo では「generic で見やすい」より「現場で速く判断できる」ことを優先する
