# 2026-04-01 Phase 2 Metrics 実装メモ

## 目的

- `dashboardAnalytics.ts` の KPI を Phase 2 で固定した画面指標に寄せる
- `EMS` / `HOSPITAL` / `ADMIN` で case 集計と target 集計の境界を明確にする
- `search score snapshot` の扱いを今回の単位で判断する

## 今回の実装

1. `lib/dashboardAnalytics.ts` を更新
   - EMS:
     - `覚知〜初回照会` の平均 / 中央値を KPI 化
     - `送信〜HP決定` の平均 / 中央値を維持
     - `再送信率` / `相談移行率` を残し、照会回数平均は KPI から外した
   - HOSPITAL:
     - `backlog件数`
     - `科別依頼件数`
     - `相談後受入率`
     - `受入可能件数`
     - `受信〜既読` / `既読〜返信` の平均 / 中央値
     に整理した
   - ADMIN:
     - `全体搬送決定率`
     - `難渋事案件数`
     - `未対応滞留件数`
     - `病院別平均返信時間`
     - `地域別搬送決定時間`
     を KPI として固定した
2. Admin 集計を修正
   - 事案件数系は case ベース
   - `病院別平均返信時間` と `未対応滞留件数` は target ベース
   - case / target の役割を混在させないよう整理した
3. HOSPITAL 画面文言を更新
   - dashboard の主題を `backlog` / 応答速度 / 相談後受入 に寄せた

## 今回の判断

- `search score snapshot` は Phase 2 では保存しない
- 理由:
  - 現行 `send-history` 保存 payload と `hospital_request_targets` には score 情報の確定保存先がない
  - 後付けで一部だけ保存すると、検索時点の条件や breakdown との整合が曖昧になる
  - `score 上位採用率` を正式 KPI にするには、送信時 snapshot と再計算ポリシーを同時に設計した方が安全

## 確認

- `npm run check`

## 次

- 統合仕様書へ Phase 2 の画面指標と snapshot 見送り判断を反映する
