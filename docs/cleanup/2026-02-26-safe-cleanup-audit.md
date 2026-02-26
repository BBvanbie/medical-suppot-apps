# 安全整理監査（削除なし）

作成日: 2026-02-26

## 対象範囲

- アプリの挙動は変更しない
- テーブル/カラムは削除しない
- 病院受入依頼フローの重複コードを削減する
- 未使用・低利用候補を洗い出し、将来の段階整理に備える

## 実施したコード整理

- 病院受入依頼の一覧取得・詳細取得・既読化ロジックを共通化
  - `lib/hospitalRequestRepository.ts`
- 重複SQLを共通関数呼び出しへ置換
  - `app/api/hospitals/requests/route.ts`
  - `app/api/hospitals/requests/[targetId]/route.ts`
  - `app/hospitals/requests/page.tsx`
  - `app/hospitals/requests/[targetId]/page.tsx`
- 受入依頼系テーブル未作成時の防御的初期化を追加
  - `lib/hospitalRequestSchema.ts`

## DB利用状況（現時点）

ルート/ページから利用中の主テーブル:

- `cases`
- `hospitals`
- `emergency_teams`
- `medical_departments`
- `hospital_departments`
- `users`
- `hospital_requests`
- `hospital_request_targets`
- `hospital_request_events`
- `hospital_patients`

## 整理候補（現時点では削除しない）

### 環境変数

- `DIRECT_URL`
  - 現在のアプリコードからは直接参照していない
  - 将来の運用（Prisma/メンテナンス用途）互換のため現時点は維持

### 旧データ経路

- `cases.case_payload.sendHistory`
  - 既存UI（履歴表示）でまだ参照している
  - 新しい正規フローは `hospital_requests*` テーブル群
  - 廃止は段階移行後に実施する

### 将来見直し候補テーブル

- `hospital_request_events`
  - 書き込みは多いが、現時点の画面露出は限定的
  - 監査ログとして重要なため維持推奨
- `hospital_patients`
  - 病院側「搬送患者一覧」で利用中
  - 今後の患者詳細拡張を見込んで維持

## 検証結果

- `npm run lint` 成功
- `npm run build` 成功
