# 訓練 / デモモード設定導線と利用者ガイド設計

最終更新: 2026-04-13

## 目的

- 訓練 / デモモードの実装はあるが、role ごとの設定画面から利用者が迷わず理解できる資料が不足している状態を解消する。
- `DISPATCH` だけ mode 切替の UI 導線が欠けているため、role 間で到達性を揃える。

## レビュー結果

1. `DISPATCH` は TRAINING 案件を作成できるが、設定画面から `currentMode` を切り替える導線が無い。
2. EMS / HOSPITAL / ADMIN の mode 設定画面は切替 UI だけで、開始前確認、終了手順、注意点、FAQ が画面内に無い。
3. 運用手順の原本は `docs/operations/training-demo-runbook.md` にあるが、実利用者が設定画面から直接辿る導線が無い。

## 方針

- role ごとの mode 設定画面に、共通 UI vocabulary の `TrainingModeGuidePanel` を追加する。
- panel には次を含める。
  - 最初に確認すること
  - 4 step の簡易フロー
  - role 別注意点
  - 2 問程度の FAQ
  - 次に開くべき画面への導線
- `DISPATCH` には `settings` と `settings/mode` を新設し、sidebar から入れるようにする。
- docs 側では runbook に FAQ を追記し、画面内資料の原本も残す。

## 非目標

- TRAINING 専用 analytics の追加
- support ページ全面刷新
- PDF や外部配布資料の新規作成

## 検証

- `npm run check`
- `e2e/tests/training-mode.spec.ts`
- 必要なら `dispatch/settings/mode` の focused E2E を追加
