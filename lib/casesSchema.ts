import { assertSchemaRequirements } from "@/lib/schemaRequirements";

let ensured = false;
let attempted = false;
let ensurePromise: Promise<void> | null = null;

export async function ensureCasesColumns() {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;
  if (attempted) return;

  ensurePromise = (async () => {
    attempted = true;

    try {
      await assertSchemaRequirements(
        "ensureCasesColumns",
        [
          {
            table: "cases",
            columns: [
              "case_payload",
              "updated_at",
              "case_uid",
              "mode",
              "dispatch_at",
              "created_from",
              "created_by_user_id",
              "case_status",
            ],
            indexes: [
              "idx_cases_case_uid_unique",
              "idx_cases_case_id",
              "idx_cases_mode_updated",
              "idx_cases_mode_team_timeline",
              "idx_cases_mode_division",
              "idx_cases_created_from_created_at",
              "idx_cases_dispatch_at",
            ],
            constraints: ["cases_mode_check", "cases_division_check"],
          },
          {
            table: "emergency_teams",
            columns: ["case_number_code"],
            indexes: ["idx_emergency_teams_case_number_code_unique"],
            constraints: ["emergency_teams_case_number_code_check"],
          },
        ],
        "Run `npm run db:bootstrap` or apply `scripts/setup_cases_schema.sql` before starting the app.",
      );
      ensured = true;
    } catch (error) {
      attempted = false;
      throw error;
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}
