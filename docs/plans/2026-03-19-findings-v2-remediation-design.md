# A-side Findings v2 Remediation Design

## Goal

- Make `findingsV2` the only source of truth for A-side findings.
- Remove active dependence on legacy `findings` and old findings UI.
- Keep read compatibility for existing records without writing legacy findings back on save.
- Prevent text corruption and placeholder leakage during the remaining migration.

## Constraints

- `case_payload` is stored as JSON, so DB schema migration is not required for `findingsV2`.
- Existing records may contain only legacy `findings`.
- Time-like fields may remain free-text because vague expressions such as `in the morning` must be allowed.

## Priority

### P0

1. Make save, reload, and patient summary flows rely on `findingsV2` and `changedFindings` only.
- Files: `components/cases/CaseFormPage.tsx`, `lib/casePatientSummary.ts`, `components/shared/PatientSummaryPanel.tsx`
- Done when: new saves work without legacy `findings`, and reload shows the same data and summary.

2. Restrict legacy findings compatibility code to read-only migration support.
- Files: `lib/caseFindingsNormalizer.ts`, `lib/caseFindingsLegacyAdapter.ts`
- Done when: old data can still be opened, but new saves do not depend on legacy write-back.

3. Align all patient-summary consumers with the new `changedFindings` detail format.
- Files: `components/shared/PatientSummaryPanel.tsx`, `components/cases/CaseFormSummaryTab.tsx`
- Done when: EMS and hospital summaries interpret state and detail strings the same way.

### P1

4. Remove old findings state and helper logic from `CaseFormPage`.
- File: `components/cases/CaseFormPage.tsx`
- Done when: findings logic is centered on `findingsV2` instead of old per-field state.

5. Split findings-related logic into smaller modules.
- Files: `components/cases/*`, `lib/caseFindings*`
- Done when: UI, migration, summary generation, and save/read logic are separated.

6. Lock down text-safety verification flow.
- Files: `AGENTS.md`, docs
- Done when: PowerShell output is not treated as the source of truth for Japanese text, and UTF-8 aware verification is standard.

### P2

7. Recheck downstream consumers of `changedFindings`.
- Files: `components/settings/OfflineQueuePage.tsx`, `components/hospitals/*`, `components/shared/PatientSummaryPanel.tsx`
- Done when: non-EMS screens do not depend on legacy findings shape.

8. Add test coverage for findings v2 and draft behavior.
- Files: `e2e/tests/*`
- Done when: save, reload, summary, and draft restore flows are covered.

## Recommended Order

1. P0-1 and P0-2
2. P0-3
3. P1-4 and P1-5
4. P2 items

## Review Checklist

- Opening old data and saving it again must not change meaning.
- `changedFindings` must match across EMS, hospital, and settings consumers.
- New case creation must not silently restore the latest unrelated local draft.
- No touched file may contain mojibake or placeholder remnants such as `?`, `??`, or `???` in user-facing text.
