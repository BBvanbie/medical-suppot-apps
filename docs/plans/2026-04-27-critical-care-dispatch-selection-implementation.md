# 救命・CCU 通常事案の本部選定フロー実装

日付: 2026-04-27

## 背景

通常事案でも、選定科目が救命またはCCUの場合は、EMSから病院へ直接受入要請を送らず、本部に選定依頼を集約する。

対象フロー:

- EMS -> dispatch -> HP -> dispatch -> EMS

## 実装方針

- 救命 / CCU / CCUネットワーク / CCUネ を本部選定対象として共通判定する。
- EMSの送信確認画面では、対象科目を含む場合に `/api/cases/dispatch-selection-requests` へ送信する。
- 初回EMS依頼では `hospital_request_targets` を作らない。病院へ直接通知しない。
- 初回依頼は `hospital_requests.patient_summary` と `cases.case_payload.summary.dispatchSelectionRequest` に本部選定依頼として保存する。
- dispatch の選定依頼一覧では target 未作成の本部選定依頼も表示対象にする。
- dispatch が病院を選択して受入依頼を送信した時点で `hospital_request_targets` と病院通知を作る。
- 病院応答はEMSへ直接通知せず、dispatch集約の応答として扱う。
- dispatch が受入可能病院をEMSへ返送した後だけ、EMS側で搬送決定できる。
- TRIAGEとは異なり、通常救命・CCU選定では受入可能人数入力は必須にしない。

## 主な変更

- `lib/criticalCareSelection.ts`
  - 救命・CCU系診療科の判定を共通化。
- `app/api/cases/dispatch-selection-requests/route.ts`
  - EMSからdispatchへの通常救命・CCU選定依頼を追加。
- `app/api/dispatch/cases/[caseId]/hospital-requests/route.ts`
  - TRIAGEに加えて通常救命・CCUのdispatch-managed病院依頼を許可。
- `app/api/dispatch/cases/[caseId]/assignment/route.ts`
  - 通常救命・CCUの受入可能病院を依頼元EMSへ返送可能にした。
- `lib/sendHistoryStatusRepository.ts`
  - dispatch-managed通常選定では病院応答をEMSへ直接通知しない。
  - TRIAGE時だけ受入可能人数を必須にした。
- EMS / DISPATCH / HOSPITAL UI
  - EMS送信確認、完了画面、病院検索CTAに本部選定表示を追加。
  - dispatch選定依頼一覧に救命・CCU本部選定の操作面を追加。
  - 病院側一覧・詳細に「本部選定」表示を追加。

## 検証

- `npm run check`
- `npx.cmd playwright test e2e/tests/dispatch-flows.spec.ts --reporter=line`

E2Eでは、EMS本部選定依頼、dispatch病院依頼、病院受入可能、dispatchからEMS返送、EMS搬送決定まで確認した。
