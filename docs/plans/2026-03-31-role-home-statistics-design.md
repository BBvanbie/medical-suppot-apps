# 2026-03-31 Role Home Statistics Design

## 結論
- EMS / HP / Admin ごとに、ホームは高優先の状況確認と主要導線に限定し、詳細分析は統計ページへ分離する。
- 第1段では期間フィルタを `today / 7d / 30d / 90d` で実装し、依存追加なしで server-side 集計 + 軽量 bar/list UI で提供する。

## 前提と制約
- 既存コードベースには role 別ホームはあるが、統計ページの集計基盤は薄い。
- 病院検索や事案フォームの文脈で使うため、サイドバー導線まで含めて role ごとに独立ページを持つ。
- 時間系指標は平均と中央値を優先し、分類分析は種別 / 科目 / 年齢帯 / 地域の主要なものから入れる。
- グラフライブラリ追加は行わず、既存 UI に合わせて面分け主体のカードとバー表示でまとめる。
- 本番 DB が一時的に旧スキーマ混在でもホーム/統計が 500 にならないよう、集計クエリは旧スキーマ互換 fallback を持つ。

## 推奨設計
- `lib/dashboardAnalytics.ts` に role 別の server-side 集計関数を置く。
- `components/analytics/AnalyticsSections.tsx` に KPI、分布、トレンド、アラート、未対応リストの共通 UI を置く。
- EMS は `/paramedics` を傾向確認ホームへ更新し、`/paramedics/stats` に詳細分析を追加する。
- HP は `/hospitals` を滞留管理ホームへ更新し、`/hospitals/stats` に応答速度と科目分析を追加する。
- Admin は `/admin` を全体監視ホームへ更新し、`/admin/stats` に全体統計を追加する。

## 非目標
- CSV 出力
- 任意複合フィルタ
- 厳密な難渋閾値の管理 UI
- 専用チャートライブラリ導入

## 検証方針
- `npm run check`
- role ごとのホーム / 統計ルートの表示確認
- 期間切替、サイドバー導線、主要 KPI が空データでも崩れないことを確認する
