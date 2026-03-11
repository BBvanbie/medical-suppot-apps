# EMS iPad Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A側を iPad Air 4 想定の `1180x820` 基準レイアウトへ最適化し、覚知情報行の崩れと過大な文字サイズを解消する。

**Architecture:** A側だけに表示スケールを導入し、端末幅と既存の表示設定から `compact/default/large` を決定する。事案作成画面は覚知情報行を専用レイアウトへ切り出し、一覧とフォームの文字サイズを A側スケールで段階的に制御する。

**Tech Stack:** Next.js App Router, React, Tailwind CSS, existing EMS display settings APIs

---

### Task 1: 現状の A側表示設定経路を固定する

**Files:**
- Modify: `components/settings/EmsDisplaySettingsForm.tsx`
- Modify: `app/settings/display/page.tsx`
- Modify: `lib` 配下の A側表示設定読込ロジック

**Step 1: 表示設定の保存値を確認**

- 文字サイズ設定の選択肢と保存値を確認する
- A側画面で利用できる取得経路を特定する

**Step 2: A側共通で使う表示スケールのマッピングを定義**

- `compact/default/large` と既存設定値の対応を整理する
- 設定未取得時の既定値を `viewport` ベースで決める

**Step 3: 共通ヘルパーを追加**

- A側専用の表示スケール決定ロジックを `lib` に追加する

**Step 4: 動作確認**

- 設定あり/なしで返るスケールが正しいことを確認する

### Task 2: A側ルートへ表示スケールを適用

**Files:**
- Modify: A側共通シェルコンポーネント
- Modify: 必要なら A側レイアウト関連ファイル

**Step 1: A側ルートの適用点を決める**

- 事案作成、事案一覧、詳細に共通で効く場所を確認する

**Step 2: `data-ems-scale` または CSS 変数を付与**

- A側コンテナにスケール属性を付ける
- HP側や管理画面には影響させない

**Step 3: 基本タイポグラフィ変数を追加**

- `compact` 時のラベル、本文、表ヘッダ、ボタンの基準値を定義する

**Step 4: 動作確認**

- A側だけ見た目が変わり、HP側が変わらないことを確認する

### Task 3: 事案作成画面の覚知情報行を再レイアウト

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`

**Step 1: 覚知情報行の現在構造を切り出す**

- `覚知日付 / 覚知時間 / 指令先住所` のレイアウト部分を特定する

**Step 2: iPad 基準の 3 カラム行へ変更**

- 日付と時間は固定幅寄り
- 住所は残り幅
- 狭い幅では破綻しない最小幅を設定する

**Step 3: 入力高さを統一**

- `date/time/text` 入力に共通の高さクラスを適用する
- ラベル高さと上下余白も統一する

**Step 4: 動作確認**

- `1180x820` 相当で被りがないことを確認する

### Task 4: A側一覧とフォーム文字を `compact` に対応させる

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `components/cases/CaseSearchTable.tsx`
- Modify: 必要なら `app/cases/search/page.tsx`

**Step 1: 主要な `text-sm / text-xs` を洗い出す**

- 改行を生みやすい見出し、ラベル、表セル、説明文を優先する

**Step 2: A側スケール対応クラスへ置換**

- `compact` 時に 1 段階小さくなる共通クラスへ寄せる

**Step 3: タップ領域を維持**

- 文字は小さくしてもボタン高さや入力高さは保つ

**Step 4: 動作確認**

- iPad 幅で 2 行化、3 行化が減ることを確認する

### Task 5: 表示設定の上書き動作を確認

**Files:**
- Modify: 必要なら A側表示設定反映箇所

**Step 1: `compact/default/large` の切り替えを接続**

- 保存済み文字サイズが A側に反映されるようにする

**Step 2: フォールバックを維持**

- 設定取得失敗時は `viewport` ベース既定値を使う

**Step 3: 動作確認**

- 設定変更で A側の文字サイズが変わることを確認する

### Task 6: 検証と仕上げ

**Files:**
- Test: `components/cases/CaseFormPage.tsx`
- Test: `components/cases/CaseSearchTable.tsx`

**Step 1: 型チェック**

Run: `npx.cmd tsc --noEmit`

Expected: PASS

**Step 2: lint**

Run: `npm.cmd run lint`

Expected: PASS

**Step 3: ビルド**

Run: `npm.cmd run build`

Expected: PASS

**Step 4: 手動確認**

- `1180x820` 相当で事案作成画面を確認
- 覚知情報行の高さと重なりを確認
- 事案一覧の文字折り返しを確認
- 設定変更による反映を確認
