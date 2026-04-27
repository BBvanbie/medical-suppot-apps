import { assertSchemaRequirements } from "@/lib/schemaRequirements";

let ensured = false;
let attempted = false;
let ensurePromise: Promise<void> | null = null;

export async function ensureHospitalRequestTables(): Promise<void> {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;
  if (attempted) return;

  ensurePromise = (async () => {
    attempted = true;

    try {
      await assertSchemaRequirements(
        "ensureHospitalRequestTables",
        [
          {
            table: "hospital_requests",
            columns: [
              "request_id",
              "case_id",
              "case_uid",
              "mode",
              "patient_summary",
              "from_team_id",
              "created_by_user_id",
              "first_sent_at",
              "sent_at",
            ],
            indexes: [
              "hospital_requests_request_id_key",
              "idx_hospital_requests_case_id",
              "idx_hospital_requests_case_uid",
              "idx_hospital_requests_first_sent_at",
              "idx_hospital_requests_sent_at",
              "idx_hospital_requests_case_uid_sent_at",
              "idx_hospital_requests_mode_sent_at",
              "idx_hospital_requests_created_by_created",
            ],
          },
          {
            table: "hospital_request_targets",
            columns: [
              "hospital_request_id",
              "hospital_id",
              "status",
              "selected_departments",
              "updated_by_user_id",
              "distance_km",
              "accepted_capacity",
            ],
            indexes: [
              "hospital_request_targets_hospital_request_id_hospital_id_key",
              "idx_hospital_request_targets_hospital_id",
              "idx_hospital_request_targets_status",
              "idx_hospital_request_targets_updated_at",
              "idx_hospital_request_targets_hospital_updated",
              "idx_hospital_request_targets_hospital_status_updated",
              "idx_hospital_request_targets_request_status_updated",
            ],
            foreignKeys: [
              { name: "hospital_request_targets_hospital_request_id_fkey", deleteAction: "RESTRICT" },
              { name: "hospital_request_targets_hospital_id_fkey", deleteAction: "RESTRICT" },
            ],
          },
          {
            table: "hospital_request_events",
            columns: ["target_id", "event_type", "acted_by_user_id", "reason_code", "reason_text"],
            indexes: [
              "idx_hospital_request_events_target_id",
              "idx_hospital_request_events_acted_at",
              "idx_hospital_request_events_target_type_status_acted",
              "idx_hospital_request_events_actor_acted",
            ],
            foreignKeys: [{ name: "hospital_request_events_target_id_fkey", deleteAction: "RESTRICT" }],
          },
          {
            table: "hospital_patients",
            columns: ["target_id", "hospital_id", "case_id", "case_uid", "request_id", "mode", "status"],
            indexes: ["hospital_patients_target_id_key", "idx_hospital_patients_case_uid_unique"],
            foreignKeys: [
              { name: "hospital_patients_target_id_fkey", deleteAction: "RESTRICT" },
              { name: "hospital_patients_hospital_id_fkey", deleteAction: "RESTRICT" },
            ],
          },
          {
            table: "hospital_department_availability",
            columns: ["hospital_id", "department_id", "is_available", "updated_at"],
            indexes: [
              "hospital_department_availability_pkey",
              "idx_hospital_department_availability_hospital_available",
            ],
          },
          {
            table: "notifications",
            columns: [
              "audience_role",
              "mode",
              "team_id",
              "hospital_id",
              "target_user_id",
              "kind",
              "case_id",
              "case_uid",
              "target_id",
              "severity",
              "dedupe_key",
              "expires_at",
              "acked_at",
            ],
            indexes: [
              "idx_notifications_role_scope_unread_created",
              "idx_notifications_role_mode_scope_unread_created",
              "idx_notifications_target_user_unread_created",
              "idx_notifications_target_user_mode_unread_created",
              "idx_notifications_ems_team_unread_created",
              "idx_notifications_hospital_unread_created",
              "idx_notifications_case_target",
              "idx_notifications_case_uid_target",
              "idx_notifications_dedupe_key",
              "idx_notifications_scope_dedupe_unique",
            ],
            constraints: [
              "notifications_case_identity_check",
              "notifications_team_id_fkey",
              "notifications_hospital_id_fkey",
              "notifications_target_id_fkey",
            ],
          },
          {
            table: "emergency_teams",
            columns: ["phone"],
          },
        ],
        "Run `npm run db:bootstrap` or apply `scripts/setup_hospital_requests.sql` before starting the app.",
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
