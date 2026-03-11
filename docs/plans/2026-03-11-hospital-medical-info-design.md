# Hospital Medical Info Design

**Date:** 2026-03-11

## Goal

病院ポータル `/hospitals/medical-info` に、病院自身が診療科ごとの現在の診療可否を即時更新できる 3D フリップカード UI を追加する。同時に、この現在可否を A側の病院検索系へ反映させる。

## Decision

現在可否は既存 `hospital_departments` の追加列ではなく、専用テーブルで管理する。

採用テーブル案:

- `hospital_department_availability`
  - `hospital_id`
  - `department_id`
  - `is_available`
  - `updated_at`

主キーは `(hospital_id, department_id)` を想定する。

## Why Dedicated Table

- 既存の `hospital_departments` は「病院と診療科の所属関係」を表す責務に留める方が明確。
- 今回の可否は「瞬間的な運用状態」であり、所属情報と分離した方が将来の履歴化や監査拡張にも対応しやすい。
- 段階的移行がしやすい。まず新テーブル導入、次に参照先を切り替え、最後に不要ロジックを整理できる。

## Non-Goals

- 編集モーダル
- 保存ボタン
- 理由入力
- 3状態以上の拡張
- 更新者表示
- 履歴 UI

## Page Architecture

ページは既存 `HospitalPortalShell` を利用する。構成は以下。

1. ヘッダ
2. 説明文
3. 全体サマリー
4. 診療科カードグリッド

カードは診療科 1 件 = 1 カード。

- 表面: 診療可能
- 裏面: 診療不可

クリックで即時トグルする。保存中はそのカードのみ操作不可。失敗時はロールバックする。

## UI Rules

- 表面は白ベース + 緑アクセント
- 裏面は薄グレー基調
- 表裏とも文言は同一
- 表示内容は診療科名と最終更新時刻のみ
- 保存中はオーバーレイまたはスピナーで明示
- 反転アニメーションは 200ms-350ms

## Data Flow

### Read path

`GET /api/hospitals/medical-info`

- 認証ユーザーから hospitalId を取得
- 自院に紐づく診療科一覧を返す
- 返却値は `hospital_departments` と `medical_departments` を基点にしつつ、`hospital_department_availability` を LEFT JOIN する
- availability 行がない場合は `is_available = true` とみなす

### Write path

`PATCH /api/hospitals/medical-info/[departmentId]`

- HOSPITAL のみ許可
- 自院に紐づく診療科であることを検証
- `is_available` を upsert
- `updated_at` を現在時刻へ更新
- 更新後状態を返す

## Search Reflection Strategy

A側検索の「ロジックと表示ロジックは変えない」。

変えるのは、検索時に参照する診療科可否の真実源だけとする。

### Address search / municipality search

既存 SQL の病院候補生成を大きく変えず、診療科一致や available 情報生成時に `hospital_department_availability` を参照する。

### Individual hospital search

既存の病院カード構造は維持する。各診療科ボタンの `available` を新テーブル反映済みで返す。

### Important constraint

病院の出し方、タブ構成、病院カード構成、チェック操作などの UX は変えない。

## Migration Strategy

段階的に行う。

1. 新テーブル追加
2. 病院診療情報 API を新テーブル基準で作成
3. `/hospitals/medical-info` UI を実装
4. A側検索 API が availability を参照するよう切替
5. 既存の不要分岐や古い仮実装を削除

## Error Handling

- API 失敗時は 4xx/5xx を明示
- フロントは optimistic 更新後にロールバック
- 保存中カードは連打不可
- 他カードは通常操作可

## Testing

最低限以下を確認する。

- HOSPITAL 以外は API 拒否
- 自院外の department 更新は拒否
- 一覧取得で未登録 availability は `true` 扱い
- トグル更新後に状態と時刻が返る
- A側個別検索で availability が反映される
- A側市区/住所検索でも availability 参照が反映される

## Files Expected To Change

- `app/hospitals/medical-info/page.tsx`
- `components/hospitals/*medical-info*` 新規
- `app/api/hospitals/medical-info/route.ts` 新規
- `app/api/hospitals/medical-info/[departmentId]/route.ts` 新規
- `lib/*hospital department availability*` 新規または既存拡張
- `app/api/hospitals/recent-search/route.ts`
- 必要なら A側検索 UI 型定義ファイル

## Notes

既存 `app/hospitals/medical-info/page.tsx` は現在プレースホルダで、ここを正式実装へ置き換える。検索への反映は SQL とレスポンス整形に限定して切り分け、画面の出し方は維持する。
