# 2026-03-08 Case Detail Back Navigation Design

## Goal

Add a fixed return route from the EMS case detail screen back to the case list.

## Scope

- Keep the existing `ホームへ戻る` action.
- Add `一覧へ戻る` on the case detail screen.
- Use a fixed destination: `/cases/search`.

## Approach

- Show the new button only on `edit` mode in `CaseFormPage`.
- Add the same fixed list link to the case-not-found state in `app/cases/[caseId]/page.tsx`.

## Verification

- Open an EMS case detail page and confirm `一覧へ戻る` navigates to `/cases/search`.
- Confirm `ホームへ戻る` remains available.
