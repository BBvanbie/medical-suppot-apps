# 指令一覧 / 事案一覧 / 選定依頼一覧 分離 実装記録

日付: 2026-04-27

## 目的

- 指令一覧は、本部が起票した指令履歴の追跡に限定する。
- 現在進行形の事案は、事案一覧で管理する。
- 病院選定依頼が発生している事案は、選定依頼一覧で別管理する。
- EMS / DISPATCH / HOSPITAL で同じ概念の画面名を揃え、運用時の迷いを減らす。

## 実装判断

- 既存の `/api/dispatch/cases` はTRIAGE/MCI E2Eや本部処理が参照しているため互換維持し、画面側で表示スコープを分ける。
- DISPATCH画面は `commandHistory`、`activeCases`、`selectionRequests` の3スコープを使う。
- DISPATCHの進行事案一覧は大量データセットでも詰まらないよう、新しい順の上限付き一覧にする。
- EMSには `/cases/selection-requests` を追加し、通常の事案一覧から病院選定依頼ありの事案だけを切り出す。
- HOSPITALの `/hospitals/requests` は画面名を「選定依頼一覧」に寄せ、受入要請よりも選定依頼として認識しやすくする。

## 変更内容

- DISPATCH:
  - `/dispatch/cases`: 指令一覧。DISPATCH起票履歴のみ。
  - `/dispatch/active-cases`: 事案一覧。現在進行形の事案。
  - `/dispatch/selection-requests`: 選定依頼一覧。病院選定依頼が発生している事案。
- EMS:
  - `/cases/selection-requests`: 選定依頼一覧。送信先履歴がある事案のみ。
- HOSPITAL:
  - `/hospitals/requests`: 表示名を選定依頼一覧へ変更。

## 検証

- `npm run typecheck`
- `NODE_OPTIONS=--max-old-space-size=4096 npx.cmd eslint <変更ファイル>`
- `NODE_OPTIONS=--max-old-space-size=4096 npm run lint`
- `npx.cmd playwright test e2e/tests/dispatch-flows.spec.ts --reporter=line`
- `npx.cmd playwright test e2e/tests/role-shells.spec.ts --grep "DISPATCH pages" --reporter=line`
- `npx.cmd playwright test e2e/tests/hospital-flows.spec.ts --grep "HOSPITAL request detail" --reporter=line`

## 残り

- 選定依頼一覧にMCI専用の色別受入依頼件数を統合表示するかは、MCI運用UIの次段階で判断する。
