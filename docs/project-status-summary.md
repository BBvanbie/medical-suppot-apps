# プロジェクト進行状況まとめ

最終更新: 2026-04-06

この文書は、プロジェクト全体の進行状況を短く把握するためのサマリとする。  
機能一覧は [project-feature-inventory.md](/C:/practice/medical-support-apps/docs/project-feature-inventory.md)、現在の再開点は [current-work.md](/C:/practice/medical-support-apps/docs/current-work.md) を参照する。

## 1. 全体ステータス

- 全体進捗感
  - 主要機能は実装済み
  - 主要 role flow は成立済み
  - design system の基礎移植は完了済み
  - E2E はフルスイート通過済み
- 現在の段階
  - 新規テーマへ進める段階
  - 大きな未解決障害より、追加テーマ選定が主題

## 2. 完了済みの大項目

### 2-1. 業務フロー

- EMS 事案入力
- 病院検索と送信
- 病院相談フロー
- EMS 搬送決定 / 搬送辞退
- HOSPITAL 受入要請対応
- HOSPITAL 患者一覧 / 診療情報
- ADMIN 事案一覧 / 監視導線
- DISPATCH 起票 / 一覧

### 2-2. 安全性 / 整合性

- 認可共通化
- 他隊 / 他院アクセス拒否
- `TRANSPORT_DECIDED` 終端化
- 二重搬送決定防止
- 再遷移拒否
- send-history の caseRef / caseUid 整合

### 2-3. 通知 / alert

- 通知運用項目実装
- dedupe
- ack
- EMS / HOSPITAL stalled alert
- ADMIN dashboard alert
- repeat / reply delay 運用通知

### 2-4. オフライン

- offline queue
- resend / retry all / discard
- failure reason 分類
- conflict restore
- server 優先破棄導線
- offline focused E2E

### 2-5. analytics / KPI

- Phase 2 metrics 実装
- EMS / HOSPITAL / ADMIN KPI 定義整理
- dashboard analytics 実装
- search score の server-side 算出と表示

### 2-6. UI / design system

- 方針書初版作成
- `UI_RULES` の design system 再編
- token / primitive 導入
- shell / workbench / field / table / dialog / loading 共通化
- major page pattern 共通化
- analytics page composition 共通化
- 今後の新規機能で design system 必須運用を明記済み

### 2-7. テスト

- focused E2E 整備
- bulk 100件 dataset 整備
- bulk views / mutations regression
- full Playwright 通過

## 3. 現在の品質状況

2026-04-06 時点の確認結果:

- `npm run check` 通過
- `npm run test:e2e` 通過
  - `38 passed`
- bulk dataset と通常 E2E fixture の共存問題を解消済み
- Admin dashboard の server/client 境界不整合も修正済み

## 4. 保留中の項目

### 4-1. offline diff / automerge

- 状態
  - 保留
- 理由
  - 現在の競合検知は `baseServerUpdatedAt` 比較中心
  - 安全な差分比較 UI と自動マージに必要な `server payload snapshot` が未整備
- 着手条件
  - snapshot の保持方法
  - 比較対象フィールドの限定
  - 自動マージ対象の限定

## 5. 直近で残っている作業の性質

- 未実装の大機能が詰まっている状態ではない
- 残っているのは主に次の2種類
  - 新規テーマの選定
  - 保留中テーマを再開できる条件が揃ったかの再判断

## 6. 次に自然な進め方

### 6-1. 推奨

1. 新しい機能テーマを決める
2. そのテーマを既存 design system 前提で設計する
3. 必要なら plan を `docs/plans/` に追加する

### 6-2. 条件付き

1. `offline diff/automerge` の再検討
2. analytics / dashboard のさらなる抽象化
3. 新規 workflow 用の focused E2E 追加

## 7. 参照順

全体把握の入口としては、次の順で読む。

1. [project-status-summary.md](/C:/practice/medical-support-apps/docs/project-status-summary.md)
2. [project-feature-inventory.md](/C:/practice/medical-support-apps/docs/project-feature-inventory.md)
3. [current-work.md](/C:/practice/medical-support-apps/docs/current-work.md)
4. [system-spec-2026-03-29.md](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md)
5. [UI_RULES.md](/C:/practice/medical-support-apps/docs/UI_RULES.md)
