# Admin / HOSPITAL 導線強化実装メモ

最終更新: 2026-04-06

## 目的

- Admin は監視 / 分析導線を強化する
- HOSPITAL は backlog / consult / response の対応効率を上げる

## 実装ステップ

### Step 1. Admin drill-down 定義

- 問題カテゴリ別
- 病院別
- 地域別
- dashboard から一覧へ条件付き遷移

### Step 2. HOSPITAL priority sort

- `NEGOTIATING` 停滞
- `READ` 未返信
- `UNREAD` 未読
- `ACCEPTABLE` 未確定
- 古い順

### Step 3. HOSPITAL detail panel 強化

- patient summary
- selection history
- comment history
- current status
- recent action
- next action

### Step 4. focused E2E

- HOSPITAL priority order
- Admin drill-down filter
- HOSPITAL direct response path

## 初回実装の完了条件

- priority sort がコード上で明示される
- HOSPITAL detail panel が必要情報を一画面で持つ
- Admin 側に drill-down path が定義される

## 実施記録

### 2026-04-06

- Step 1 実装
  - Admin home に `PROBLEM DRILL-DOWN`、病院別 / 地域別 drill-down link を追加
  - `/admin/cases` API に `problem / hospitalName / area` filter を追加
  - `AdminCasesPage` に drill-down context note を追加
- Step 2 実装
  - HOSPITAL priority sort を `lib/hospitalPriority.ts` に明示化
  - request list / consult list / dashboard pendingItems に同じ sort を適用
- Step 3 実装
  - `HospitalRequestDetail` に `直近 action` と `次に押せる action` を追加
- focused E2E
  - `e2e/tests/admin-hospital-intervention.spec.ts` を追加
  - 当初は localhost 応答不安定で Playwright の `page.goto(/login)` が `ERR_ABORTED` になり、再確認未完了だった
  - 2026-04-06 の localhost 安定化後に `e2e/tests/admin-hospital-intervention.spec.ts` は再通過

### 2026-04-13

- HOSPITAL 一覧の first look を補強
  - `HospitalRequestsTable` と `HospitalConsultCasesTable` に選定科目 priority chip を追加
  - `救命優先 / CCU優先 / 脳卒中優先` を上段に出し、選定科目自体も card header 直下へ移動
  - status ごとの `次に見ること` を共通 vocabulary で表示し、一覧だけで次アクションを判断しやすくした
  - `requests` / `consults` page header 直下に summary strip を追加し、priority 件数、未返信件数、相談継続件数を一覧に入る前に把握できるようにした
  - `HospitalRequestDetail` の最上段に `priority / next action / recent action` の summary block を追加し、詳細表示直後の判断時間を短縮した
  - `HospitalRequestDetail` の patient summary 上段に `JUDGEMENT CHECK` を追加し、送信元、HP側コメント、A側回答を近接表示した
  - `consult view` にも `CONSULT CHECKPOINTS` を追加し、選定科目、最新HPコメント、最新Aコメントをチャット直前で見られるようにした
- ADMIN monitoring の drill-down を補強
  - `/admin/monitoring` に `CASE DRILL-DOWN` section を追加
  - `選定停滞 / 要相談停滞 / 返信遅延` から `/admin/cases` の filtered workbench へ直接遷移できるようにした
  - `/admin/cases` の drill-down 条件を chip 表示にし、landing 後も流入理由が視認しやすいようにした
  - `/admin/cases` detail pane に `drill-down context / next action` の summary block を追加し、右 pane 単体でも確認意図を維持できるようにした
  - problem 名や説明は `lib/admin/adminProblemDrillDown.ts` に寄せ、`home / monitoring / cases` で同じ vocabulary を使うようにした
  - `CaseSelectionHistoryTable detailed` に `PRIORITY / NEXT ACTION / LAST TOUCH` を追加し、history tab でも停滞理由を拾いやすくした
- 画面確認
  - headless screenshot で `admin/monitoring`、`admin/cases?problem=selection_stalled`、`hospitals/requests`、`hospitals/consults` の表示を確認した
- focused E2E
  - `admin-hospital-intervention.spec.ts` に monitoring からの drill-down を追加
  - `hospital-flows.spec.ts` で HOSPITAL request list の priority chip 表示を確認対象に追加
  - 追加で `admin-monitoring` の focus list と、`hospitals/patients` / `hospitals/declined` の summary strip を focused E2E で確認するようにした
- 追加強化
  - `/admin/monitoring` の health signals を「異常が出ているものを先に見る順」で再配置し、右カラムに `FOCUS NOW` を追加した
  - `hospitals/patients` に `TOTAL PATIENTS / PRIORITY DEPTS / CONSULTING / TRANSPORT DECIDED` の summary strip を追加した
  - `HospitalPatientsTable` の各カードに `status / priority / next action` chip を追加し、受入後の追跡判断を一覧で拾いやすくした
  - `hospitals/declined` にも summary strip を追加し、各カードで `status / priority / next action` を見られるようにした
  - `admin/cases` の history tab 直上に `HISTORY FOCUS / WAITING REPLY / ACCEPTABLE` summary を追加し、履歴確認時の first look を強化した
  - `hospitals/patients` の modal / detail page 直上に `FOLLOW-UP CHECK` を追加し、受入後の継続確認文法を request detail と揃えた
