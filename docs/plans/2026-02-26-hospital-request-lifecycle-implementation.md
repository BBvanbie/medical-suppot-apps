# 病院受入依頼ライフサイクル実装計画

> **実装担当向け:** タスク単位で順番に実装し、各段階で検証する。

**ゴール:** 病院側受入依頼一覧を自院宛データのみ表示し、既読・回答・搬送決定連携を実現する。  
**構成:** `hospital_requests`（ヘッダ）+ `hospital_request_targets`（病院別）+ `hospital_request_events`（監査）  
**技術:** Next.js 16 / TypeScript / PostgreSQL / Auth.js

---

### タスク1: 専用テーブル追加

- `scripts/setup_hospital_requests.sql` を追加
- 4テーブルを作成:
  - `hospital_requests`
  - `hospital_request_targets`
  - `hospital_request_events`
  - `hospital_patients`

### タスク2: 状態遷移ルール定義

- `lib/hospitalRequestStatus.ts` で状態と遷移制約を定義

### タスク3: 救急隊送信時の保存処理追加

- `app/api/cases/send-history/route.ts` で専用テーブルへ保存
- `hospital_request_targets` 初期状態は `UNREAD`

### タスク4: 病院側一覧API

- `app/api/hospitals/requests/route.ts`
- ログイン病院IDで絞り込み

### タスク5: 病院側詳細API + 既読化

- `app/api/hospitals/requests/[targetId]/route.ts`
- 詳細表示時に `UNREAD -> READ`

### タスク6: 病院回答API

- `app/api/hospitals/requests/[targetId]/status/route.ts`
- 受入可能/受入不可/要相談の更新

### タスク7: 救急隊最終判断API

- `app/api/paramedics/requests/[targetId]/decision/route.ts`
- `TRANSPORT_DECIDED` 時に `hospital_patients` へ反映

### タスク8: 病院側一覧UI

- `app/hospitals/requests/page.tsx`
- `components/hospitals/HospitalRequestsTable.tsx`

### タスク9: 病院側詳細UI

- `app/hospitals/requests/[targetId]/page.tsx`
- `components/hospitals/HospitalRequestDetail.tsx`

### タスク10: 救急隊側可視化

- 病院ごとの未読/既読/回答状態を表示

### タスク11: ドキュメント更新

- README / IMPLEMENTATION_GUIDE を更新
- セットアップ・運用手順を追記

### 最終確認

- `npm run lint`
- `npm run build`
- 成功後にコミット
