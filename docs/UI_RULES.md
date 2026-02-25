# UI統一ルール（医療搬送支援システム）

最終更新: 2026-02-25

このドキュメントは、現在の画面デザインを維持するための実装ルールです。  
新規ページ・既存改修のどちらでも、このルールを優先して適用します。

## 1. 全体トーン

- 白基調ダッシュボードを維持する
- 背景は `dashboard-shell`（`--dashboard-bg`）を使用する
- 背景色は `ghostwhite (#f8f8ff)` に統一する
- 本文文字は `text-slate-900` を基準にする
- 日本語UIを標準とする

## 2. カラー運用

- メインアクセント: `--accent-blue`（主要CTA、選択状態）
- サブアクセント: `--accent-teal`（セクション見出しの英字ラベル）
- 注意系: `amber/red` 系（警告・エラーのみ）
- 成功状態でも画面全体を緑背景にしない

## 3. レイアウト

- 基本利用端末は PC / iPad横
- 主要ページは `h-screen + overflow` のダッシュボード構成
- 左サイドバーは共通 `Sidebar` を使い回す
- コンテンツ幅は `max-w-[1320px]` を標準とする（完了画面は `max-w-[960px]` 可）

## 4. カード・枠線

- 標準カード:
  - `rounded-2xl border border-slate-200 bg-white`
  - 必要時のみ `shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]`
- インナーカード:
  - `rounded-xl border border-slate-200 bg-white`
- 枠線は薄すぎない `border-slate-200` を基本にする

## 5. タイポグラフィ

- ページタイトル: `text-2xl font-bold`
- セクションタイトル: `text-lg font-bold`
- テーブル/フォーム本文: `text-sm`
- 補助情報: `text-xs text-slate-500`

## 6. ボタン

- 主要ボタン（実行系）:
  - `bg-[var(--accent-blue)] text-white`
- 副ボタン（戻る/キャンセル）:
  - `border border-slate-200 bg-white text-slate-700`
- 無効状態:
  - `disabled:bg-slate-300 disabled:cursor-not-allowed`

## 7. テーブル

- ヘッダー:
  - `text-xs font-semibold text-slate-500`
- 行hover:
  - `hover:bg-blue-50/30`
- 表示件数が多い場合はページング（20件）を標準

## 8. タブ

- タブコンテナ:
  - `rounded-2xl border border-slate-200 bg-white p-2`
- アクティブタブ:
  - `bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]`

## 9. 文言ルール（現在確定）

- 「受入要請送信」を正とする（「受け入れ要請送信」は使用しない）
- 「概要_バイタル」「患者サマリー」「送信履歴」表記を維持

## 10. 実装時の運用

- 新規画面作成時は、まず既存ページ（ホーム/病院検索/事案情報）のクラスを再利用する
- デザイン変更時は本ファイルも更新し、差分理由を記録する
- 例外的な配色（強い緑・強い黄など）は、意図がある状態表示に限定する
