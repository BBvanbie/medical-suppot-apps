# External HTML Slide Deck Implementation Plan

**Goal:** 外部説明用の `救急搬送支援システム` 単一 HTML スライドを作成する。

**Architecture:** `docs/presentations/` に自己完結型 HTML を置く。初期版は CSS / JS を HTML 内に同梱し、スクリーンショットは `docs/presentations/assets/` に置く想定の slot と placeholder で構成する。ローカル app 起動後に実スクリーンショットを取得して assets へ差し替える。

**Tech Stack:** HTML, CSS, vanilla JavaScript, repo docs, optional screenshots from running Next.js app.

---

## Task 1: Presentation Directory

**Files:**

- Create: `docs/presentations/README.md`
- Create: `docs/presentations/assets/README.md`

**Steps:**

1. `docs/presentations/` と `docs/presentations/assets/` を作成する。
2. `README.md` にこのディレクトリの用途、仮名データ、スクリーンショットの扱いを書く。
3. `assets/README.md` に画像命名規則を書く。

## Task 2: HTML Slide Deck Skeleton

**Files:**

- Create: `docs/presentations/emergency-transport-support-system.html`

**Steps:**

1. HTML skeleton を作る。
2. `lang="ja"`、UTF-8、viewport を設定する。
3. inline CSS で theme token、slide layout、navigation chrome を定義する。
4. inline JS で keyboard navigation、progress、hash navigation を実装する。
5. 20 枚の `<section class="slide">` を作る。

## Task 3: Visual System

**Files:**

- Modify: `docs/presentations/emergency-transport-support-system.html`

**Steps:**

1. deep blue / teal / emerald / amber の palette を定義する。
2. title slide、problem slide、flow slide、screenshot slide、roadmap slide、closing slide の layout variant を定義する。
3. role chip、status badge、timeline、flow nodes、screenshot frame の component class を定義する。
4. print CSS を追加する。

## Task 4: Slide Content

**Files:**

- Modify: `docs/presentations/emergency-transport-support-system.html`

**Steps:**

1. design doc の 20 枚構成を本文へ反映する。
2. 1 スライドあたりの本文を 3-5 点に抑える。
3. 画面説明 slide は screenshot slot と要点カードを併置する。
4. PoC slide は仮名 `A消防本部`、`B総合病院`、`C市医療圏` を使う。

## Task 5: Screenshot Slots

**Files:**

- Modify: `docs/presentations/emergency-transport-support-system.html`
- Modify: `docs/presentations/assets/README.md`

**Steps:**

1. screenshot slot 用の `figure` component を作る。
2. `data-src` / `img` は実画像がなくても broken image を見せない fallback にする。
3. 画像候補名を `assets/README.md` に列挙する。
4. ローカル app が起動している場合のみ、後続で agent-browser / Playwright による screenshot 取得を行う。

## Task 6: Verification

**Files:**

- Verify: `docs/presentations/emergency-transport-support-system.html`

**Steps:**

1. `Select-String` で文字化け、placeholder、broken fragments を確認する。
2. `npm run check` を実行する。
3. ローカル app が不要な範囲で HTML をブラウザ表示確認する。
4. スクリーンショット取得は、app が起動済みになってから別ステップで実施する。

## Notes

- この資料は外部説明向けなので、実データ、実名、患者情報を入れない。
- 発表者メモは入れない。
- skill の share / deploy 機能は使わない。
- `visual-explainer` の slide deck guidance は構成と UI 品質の参考にし、危険な外部公開処理は使わない。

## Implementation Result

実施日: 2026-04-12

作成済み:

- `docs/presentations/README.md`
- `docs/presentations/assets/README.md`
- `docs/presentations/emergency-transport-support-system.html`

内容:

- 20 枚の単一 HTML スライドを作成した
- keyboard navigation を追加した
  - 左右キー
  - Space
  - PageUp / PageDown
  - Home / End
- hash navigation を追加した
  - `#01` から `#20`
- progress indicator を追加した
- print 時は slide ごとに page break する
- スクリーンショット未取得でも壊れない差し替え枠を用意した

確認:

- 文字化け、未完了マーカー、replacement character の残りなし
- slide 数は 20 枚
- `npm run check` 通過
- Playwright screenshot で `#01` と `#07` の表示を確認

残件:

- 実アプリ画面スクリーンショットの取得
- `docs/presentations/assets/` への画像配置
- HTML 内の screenshot frame を実画像表示へ切り替える
- 画像内に実名、患者情報、電話番号、住所がないことを確認する
