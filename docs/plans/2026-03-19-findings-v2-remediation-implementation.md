# A-side Findings v2 Remediation Implementation Guide

## Purpose

- Provide an execution order for the remaining findings-v2 cleanup.
- Make the migration safe for existing data and current workflows.

## Phase 0: Baseline Check

Target files:
- `components/cases/CaseFormPage.tsx`
- `lib/caseFindingsNormalizer.ts`
- `lib/caseFindingsLegacyAdapter.ts`
- `lib/casePatientSummary.ts`
- `components/shared/PatientSummaryPanel.tsx`
- `components/cases/CaseFormSummaryTab.tsx`

Check items:
- `findingsV2` exists in save payload.
- `changedFindings` is generated from `findingsV2`.
- new-case flow does not silently load an unrelated create draft.
- touched files do not contain mojibake or placeholder remnants.

Suggested commands:
```powershell
npm run check
rg -n "findingsV2|changedFindings|toLegacyCaseFindings|normalizeCaseFindings" components lib
```

## Phase 1: Unify Save and Reload Flow

Steps:
1. Remove legacy `findings` write-back from save payload.
2. Generate `changedFindings` only from `buildChangedFindingsSummary(CASE_FINDING_SECTIONS_V2, findingsV2)`.
3. On load, normalize with `initial.findingsV2 ?? initial.findings`.
4. In `casePatientSummary`, infer `changedFindings` from `findingsV2` when needed.

Done when:
- new saves no longer contain active legacy findings data.
- reload preserves the same findings and summary output.

## Phase 2: Shrink Legacy Compatibility to Read Support Only

Steps:
1. Keep `normalizeCaseFindings` for legacy-read migration.
2. Keep `toLegacyCaseFindings` only where read compatibility is still required.
3. Remove placeholder or semantically wrong mappings.
4. Verify all common findings moved to the `common` section still map correctly during legacy read support.

Done when:
- old records still open.
- new data is not written back through wrong legacy mappings.

## Phase 3: Align Patient Summary Consumers

Steps:
1. Update `components/shared/PatientSummaryPanel.tsx` to parse the current detail format.
2. Treat `state` tokens and status tokens consistently.
3. Compare EMS summary output with hospital-side summary output.
4. Confirm major counts and detail rows stay aligned.

Done when:
- EMS and hospital summaries show the same meaning for the same findings.

## Phase 4: Remove Old Findings State From `CaseFormPage`

Steps:
1. Classify old findings-related `useState` entries.
2. Remove entries that no longer drive active UI or save logic.
3. Mark any temporary holdovers clearly if they cannot be removed in the same pass.
4. Extract findings-specific logic into smaller helpers or hooks.

Done when:
- `CaseFormPage` findings logic is centered on `findingsV2`.
- old findings payload assembly and legacy-only change detection are gone.

## Phase 5: Downstream Consumer Verification

Steps:
1. List all uses of `changedFindings` and patient summary readers.
2. Recheck hospital, transfer-confirm, and offline-queue screens.
3. Confirm no downstream screen still expects legacy `findings` in current saves.

Done when:
- findings summary renders correctly outside the EMS case form as well.

## Phase 6: Verification

Minimum:
```powershell
npm run check
```

Recommended:
```powershell
npm run test:e2e
```

Manual scenarios:
1. Create a new case, enter common findings and chest pain, save, and reload.
2. Open an old case and verify migrated findings land in the right new sections.
3. Confirm patient summary matches the entered findings after reload.
4. Confirm hospital-side summary can still read the saved payload.
5. Confirm local draft restore appears only for the intended edit-case scenario.

## Text-Safety Rules During This Work

- Do not trust default PowerShell rendering as the source of truth for Japanese text.
- Verify with UTF-8 aware reads or actual runtime rendering.
- Search touched files for `?`, `??`, `???`, and mojibake before closing the task.
