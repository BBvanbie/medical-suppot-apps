import type { PoolClient } from "pg";

import { ensureAuditLogSchema, writeAuditLog } from "@/lib/auditLog";
import type { AuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

export type TrainingDataSummary = {
  cases: number;
  hospitalRequests: number;
  hospitalRequestTargets: number;
  hospitalRequestEvents: number;
  hospitalPatients: number;
  notifications: number;
};

type CountRow = {
  case_count: string;
  request_count: string;
  target_count: string;
  event_count: string;
  patient_count: string;
  notification_count: string;
};

function toSummary(row: CountRow): TrainingDataSummary {
  return {
    cases: Number(row.case_count ?? 0),
    hospitalRequests: Number(row.request_count ?? 0),
    hospitalRequestTargets: Number(row.target_count ?? 0),
    hospitalRequestEvents: Number(row.event_count ?? 0),
    hospitalPatients: Number(row.patient_count ?? 0),
    notifications: Number(row.notification_count ?? 0),
  };
}

async function queryTrainingSummary(executor: typeof db | PoolClient): Promise<TrainingDataSummary> {
  const res = await executor.query<CountRow>(
    `
      SELECT
        (SELECT COUNT(*)::text FROM cases WHERE mode = 'TRAINING') AS case_count,
        (SELECT COUNT(*)::text FROM hospital_requests WHERE mode = 'TRAINING') AS request_count,
        (
          SELECT COUNT(*)::text
          FROM hospital_request_targets t
          JOIN hospital_requests r ON r.id = t.hospital_request_id
          WHERE r.mode = 'TRAINING'
        ) AS target_count,
        (
          SELECT COUNT(*)::text
          FROM hospital_request_events e
          JOIN hospital_request_targets t ON t.id = e.target_id
          JOIN hospital_requests r ON r.id = t.hospital_request_id
          WHERE r.mode = 'TRAINING'
        ) AS event_count,
        (SELECT COUNT(*)::text FROM hospital_patients WHERE mode = 'TRAINING') AS patient_count,
        (SELECT COUNT(*)::text FROM notifications WHERE mode = 'TRAINING') AS notification_count
    `,
  );

  return toSummary(res.rows[0]);
}

export async function getTrainingDataSummary(): Promise<TrainingDataSummary> {
  await ensureCasesColumns();
  await ensureHospitalRequestTables();
  return queryTrainingSummary(db);
}

export async function resetTrainingData(actor: AuthenticatedUser): Promise<{
  before: TrainingDataSummary;
  after: TrainingDataSummary;
}> {
  await ensureCasesColumns();
  await ensureHospitalRequestTables();
  await ensureAuditLogSchema();

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const before = await queryTrainingSummary(client);

    await client.query(`DELETE FROM notifications WHERE mode = 'TRAINING'`);
    await client.query(`DELETE FROM hospital_patients WHERE mode = 'TRAINING'`);
    await client.query(`
      DELETE FROM hospital_request_events e
      USING hospital_request_targets t, hospital_requests r
      WHERE e.target_id = t.id
        AND t.hospital_request_id = r.id
        AND r.mode = 'TRAINING'
    `);
    await client.query(`
      DELETE FROM hospital_request_targets t
      USING hospital_requests r
      WHERE t.hospital_request_id = r.id
        AND r.mode = 'TRAINING'
    `);
    await client.query(`DELETE FROM hospital_requests WHERE mode = 'TRAINING'`);
    await client.query(`DELETE FROM cases WHERE mode = 'TRAINING'`);

    const after = await queryTrainingSummary(client);

    await writeAuditLog(
      {
        actor,
        action: "admin.training.reset",
        targetType: "training_dataset",
        targetId: "all",
        before,
        after,
      },
      client,
    );

    await client.query("COMMIT");
    return { before, after };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
