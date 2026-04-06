# Admin / HOSPITAL 導線強化設計

最終更新: 2026-04-06

## 結論

- Admin は個別案件へ介入しない。`監視 / 分析 / drill-down` に徹する。
- HOSPITAL は自院宛案件に対して `閲覧 / 回答 / 相談コメント / 可否判断` を直接行う。
- したがって同じ「導線強化」でも、Admin と HOSPITAL では責務を分けて設計する。

## 前提と制約

- Admin は EMS 入力や request 状態を直接変更しない。
- HOSPITAL は EMS が入力した case 情報を編集しない。
- 既存の dashboard / rail / split workbench / detail panel pattern を流用する。

## 方式比較

### 1. Admin / HOSPITAL を同じ intervention 概念で揃える

- 長所: 用語は揃う
- 短所: 実務責務が違いすぎる
- 判断: 不採用

### 2. Admin は監視導線、HOSPITAL は対応導線として分離する

- 長所: 実務に合う。UI 判断基準も明確
- 短所: pattern の抽象化は少し減る
- 判断: 採用

## 推奨設計

### Admin

- dashboard は `問題カテゴリ別 -> 病院別 -> 地域別` の順で drill-down する
- priority watch は個別案件処理ではなく、偏在 / 滞留 / 遅延の把握を主目的にする
- split workbench を使う場合も、個別案件操作ではなく一覧 / 集計 / 詳細確認までに留める

### HOSPITAL

- priority sort
  1. `NEGOTIATING` 停滞
  2. `READ` 未返信
  3. `UNREAD` 未読
  4. `ACCEPTABLE` 未確定
  5. 同順位は古いものを先
- detail panel に出すもの
  - 患者サマリー
  - 選定履歴
  - コメント履歴
  - 現在 status
  - 直近 action
  - 自院として次に押せる action

## 非目標

- Admin による個別案件 status mutation
- HOSPITAL による EMS case 情報編集
- score ロジックの高度化

## 影響ファイル / 検証方針

- 影響候補
  - `lib/dashboardAnalytics.ts`
  - `components/hospitals/HospitalHomeKpiSection.tsx`
  - `components/hospitals/HospitalRequestsTable.tsx`
  - `components/hospitals/HospitalConsultCasesTable.tsx`
  - `components/hospitals/HospitalRequestDetail.tsx`
  - `app/admin/page.tsx`
- 検証
  - priority sort
  - filter 渡し
  - detail panel の一画面確認
  - role ごとの操作制限
