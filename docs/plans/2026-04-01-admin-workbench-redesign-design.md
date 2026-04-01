# Admin Workbench Redesign Design

最終更新: 2026-04-01

## 背景

- Admin 配下の主要ページが `settings` 系の UI 文法に寄っており、一覧監視と即時判断の密度が不足している。
- 現在の `cases / logs / users` は表中心で、重要情報と次アクションが離れやすい。
- Admin では EMS より高い情報密度を許容できるため、PC 前提の workbench 構成へ寄せる。

## 目的

- `cases / logs / users` を共通した高密度・シャープな Admin workbench へ再構築する。
- 情報設計を `monitor -> compare -> act` に揃える。
- アクセントカラーは orange を主軸にし、警告は amber / rose に分離する。

## 画面方針

### 共通

- light base
- 大きな面を少数配置し、内部で密度を上げる
- border は薄く最小限
- CTA と選択状態に orange を使う
- 一覧と詳細を同一画面内で近接配置する

### cases

- 上段: 状態サマリーとフィルタ
- 中段左: 事案一覧を table ではなく密度の高い row list で表示
- 中段右: 患者サマリー / 選定履歴の detail workbench
- expand 可能な履歴は一覧近接で確認できるようにする

### logs

- 上段: 件数、フィルタ状態、検索意図のサマリー
- 中段左: 監査ログ一覧
- 中段右: 選択中ログの詳細、変更前後 JSON
- actor / target / action / time を一画面で追えるようにする

### users

- 上段: 登録数、有効数、ロール内訳、管理方針
- 中段左: 密度の高いユーザー一覧
- 中段右: 編集面と変更履歴
- ロール変更と所属変更の整合を常に近い場所で確認できるようにする

## 実装範囲

- `components/admin/AdminPortalShell.tsx`
- `components/admin/AdminCasesPage.tsx`
- `components/admin/AdminLogsPage.tsx`
- `components/admin/AdminUsersPage.tsx`
- 必要に応じた admin 共通 UI helper

## 検証

- `npm run check`
- 必要なら admin E2E の focused 実行を追加する
