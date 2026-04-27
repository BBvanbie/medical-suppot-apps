# DISPATCH 複数隊指令起票 実装記録

日付: 2026-04-27

## 目的

- DISPATCHの指令起票で、出場隊を複数選択できるようにする。
- EMS側の自隊スコープを崩さず、各隊が自分に割り当てられた事案だけを確認できるようにする。

## 実装判断

- `cases.team_id` は単隊スコープの正本なので、1つの `cases` レコードへ複数隊を詰め込まない。
- 1回の指令操作で、選択された隊ごとに `cases` を1件ずつ作成する。
- 同じ指令操作で作成した事案は、`case_payload.dispatch.dispatchGroupId` と `case_payload.meta.dispatchGroupId` で内部的に紐付ける。
- 既存API互換のため、POST `/api/dispatch/cases` は引き続き `caseId` を返しつつ、複数作成時は `caseIds` も返す。

## 変更内容

- 起票フォームの隊選択を単一selectから複数checkboxへ変更した。
- API validationは `teamIds` を受け取り、1隊以上20隊以下、数値不正を検証する。
- repositoryは選択隊ごとに採番lockを取り、隊ごとの事案IDを作成する。
- E2Eは、DISPATCHが2隊へ同時起票し、EMS A / EMS B の双方の事案一覧に同一住所の事案が出ることを確認する内容へ更新した。

## 検証

- `npm run typecheck`
- `NODE_OPTIONS=--max-old-space-size=4096 npx.cmd eslint app/api/dispatch/cases/route.ts app/dispatch/new/page.tsx components/dispatch/DispatchCaseCreateForm.tsx lib/dispatch/dispatchValidation.ts lib/dispatch/dispatchRepository.ts e2e/tests/dispatch-flows.spec.ts`

## 未完了の確認

- `npx.cmd playwright test e2e/tests/dispatch-flows.spec.ts --reporter=line` は実行したが、ローカル `next dev` のDB接続が `ECONNRESET` になり、ログイン前に失敗した。実装起因のassertion failureではなく、認証/DB接続の環境エラーとして扱う。
