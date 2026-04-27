# EMS command desk UI redesign implementation

## ゴール

EMS の主要画面を、現場指揮卓型の情報設計へ寄せる。
第 1 弾では見た目だけでなく、通常運用と TRIAGE 運用の視覚的な分離を強める。

## Step 1. ルール更新

- `docs/UI_RULES.md` の EMS 前提を更新する。
- `STANDARD` は白ベース高密度、`TRIAGE` は白赤系 command mode として明文化する。

## Step 2. shell / sidebar

- EMS shell に `STANDARD / TRIAGE` ごとの canvas class を追加する。
- sidebar は TRIAGE 中に白赤 emergency tone へ切り替える。

## Step 3. home

- home hero を command desk として再構成する。
- quick links は primary response lane と support lane の意味を出す。
- TRIAGE 中は hero と action rail の tone を変える。

## Step 4. 事案一覧

- `EmsPageHeader` と `CaseSearchTable` に operation tone を渡す。
- 事案 card を command card 化し、TRIAGE 中は白背景 + 赤 accent を適用する。

## Step 5. 事案詳細

- 既存の compact header を維持しつつ、TRIAGE の別世界感を強化する。
- TRIAGE の入力本文は `初動情報`、`最小バイタル`、`送信履歴` に絞る。
- `患者サマリー` と詳細所見は TRIAGE の初期登録導線から外し、後続確認/通常運用側で補完する。

## Step 6. dispatch 集約連携

- TRIAGE 中のEMSは病院検索へ直行せず、本部報告として保存する。
- dispatch はEMSからの `triageDispatchReport` を事案一覧で拾い、病院連絡と搬送先振り分けを集約する。
- dispatch はTRIAGE本部報告に対して搬送先とEMSへの指示を入力し、EMS側の事案一覧に搬送先として返す。
- dispatch はTRIAGE本部報告カードから病院検索し、選択病院へ `TRIAGE受入依頼` を送信する。
- 病院の `受入可能` 応答には `accepted_capacity` を保持し、dispatch側で受入可能人数として確認する。
- dispatch が受入可能病院をEMSへ送ると、EMS通知、搬送先反映、EMS側で搬送決定できる `ACCEPTABLE` target を揃える。
- 複数EMSへ送る場合は、dispatch fanout として各EMS事案へ hospital request target を作る。
- 病院側には TRIAGE モードを導入せず、dispatch から届く通常の受入可否/要相談/受入不可の操作だけを残す。

## Step 7. 統計/グラフ

- EMS統計のタブ、フィルタ、KPI、分布バー、推移バーはTRIAGE中に白赤 tone へ切り替える。
- TRIAGE中の統計は意思決定の主導線ではなく補助情報として扱う。

## 完了条件

- EMS home、sidebar、事案一覧、事案詳細上段で `STANDARD / TRIAGE` の見た目が明確に分かれる。
- 既存の主要導線と data-testid は壊さない。
- TRIAGE登録は項目を削っても本部報告へ進める。
- dispatch が病院検索、受入依頼、応答確認、EMS複数隊送信まで進められる。
- 病院はTRIAGE受入可能時に受入可能人数を送信できる。
- EMSはdispatchから届いた受入可能病院に対して既存の搬送決定操作を押せる。
- 病院側一覧/詳細で TRIAGE 選定であることが分かる。
- 病院側に operational mode の切替 UI は追加しない。
- `npm run check` が通る。

## 2026-04-24 実装結果

- `CaseFormBasicTab` は TRIAGE 中に氏名/性別/年齢/電話/現場住所/緊急メモを優先し、OCR/ADL/DNAR/既往歴は追加情報へ折りたたむ。
- `CaseFormVitalsTab` は TRIAGE 中に本部報告メモ、主訴、START法評価、PAT法評価、傷病詳細、補助バイタルを優先する。
- `CaseFormVitalsTab` は START/PAT の色選択を手入力させず、入力内容から自動判定する。
- `lib/triageAssessment.ts` に START 自動判定、PAT 自動判定、傷病詳細の保存型と正規化を追加した。
- `CaseFormPage` は TRIAGE 中に `本部報告 -> START自動判定 -> PAT自動判定 -> 搬送先指示` の進捗を表示する。
- `PatientSummaryPanel` と病院検索の事案選定表示に TRIAGE 評価情報を出す。
- `CaseFormPage` は TRIAGE 中のタブを `初動情報 / 最小バイタル / 送信履歴` にする。
- `send-history` API と hospital request repository は TRIAGE 由来の受入要請を patient summary 内の flag として保持/返却する。
- `DispatchCasesPage` はEMSからのTRIAGE本部報告を一覧に出す。
- `DispatchTriageAssignmentForm` と `/api/dispatch/cases/[caseId]/assignment` により、dispatch が搬送先指示をケースへ反映できる。
- `TransferRequestConfirmPage` と `HospitalRequestDetail` は、TRIAGE 選定の START / PAT を上段で確認できる。
- `HospitalRequestsTable` と `HospitalRequestDetail` は `TRIAGE選定` バッジを表示する。
- `app/paramedics/stats/page.tsx` と analytics components は TRIAGE 中に赤系グラフ tone を使う。
- 検証:
  - `npm run check`
  - `npx.cmd playwright test e2e/tests/ems-triage-mode.spec.ts --reporter=line`

## 2026-04-27 追加実装結果

- `hospital_request_targets.accepted_capacity` を追加し、TRIAGE受入可能時の受入可能人数を構造化して保持する。
- `/api/dispatch/cases/[caseId]/hospital-requests` を追加し、dispatchが病院へTRIAGE受入依頼を送信し、応答一覧を取得できるようにした。
- `DispatchTriageAssignmentForm` は病院検索、受入依頼送信、病院応答確認、選択EMSへの受入可能病院送信を1つの操作面に統合した。
- dispatchのEMS送信時は、対象EMSごとに搬送決定可能な hospital request target を用意する。
- `sendHistoryStatusRepository` は dispatch-managed TRIAGE request の病院応答をEMSへ直接通知せず、dispatch送信時にEMSへ通知する。
- `HospitalRequestDetail` はTRIAGE受入可能時に受入可能人数の入力を必須にした。
- 検証:
  - `npm run typecheck`
  - `npm run check`
  - `npx.cmd playwright test e2e/tests/ems-triage-mode.spec.ts --reporter=line`
