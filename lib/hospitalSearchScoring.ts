import { db } from "@/lib/db";

type HospitalSearchMetricsRow = {
  hospital_id: number;
  avg_response_minutes: number | null;
  responded_count: number;
  acceptable_count: number;
  consult_count: number;
  consult_acceptable_count: number;
  pending_targets: number;
};

export type HospitalSearchScoreBreakdown = {
  availability: number;
  distance: number;
  responsiveness: number;
  conversion: number;
  loadPenalty: number;
  matchedDepartmentCount: number;
  selectedDepartmentCount: number;
  avgResponseMinutes: number | null;
  acceptableRate: number | null;
  pendingTargets: number;
};

export type HospitalSearchCandidate = {
  hospitalDbId: number;
  hospitalId: number;
  hospitalName: string;
  departments: string[];
  address: string;
  phone: string;
  distanceKm: number | null;
};

export type HospitalSearchScoredCandidate = HospitalSearchCandidate & {
  searchScore: number;
  scoreBreakdown: HospitalSearchScoreBreakdown;
  scoreSummary: string[];
};

const SCORE_WEIGHT = {
  availability: 45,
  distance: 25,
  responsiveness: 15,
  conversion: 10,
  loadPenaltyMax: 15,
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function formatMinutes(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "応答実績少";
  return `平均返信 ${Math.round(value)}分`;
}

function formatConversion(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "受入実績少";
  return `受入実績 ${Math.round(value * 100)}%`;
}

function calculateAvailabilityScore(matchedDepartmentCount: number, selectedDepartmentCount: number) {
  if (selectedDepartmentCount <= 0) return 0;
  return round(SCORE_WEIGHT.availability * clamp(matchedDepartmentCount / selectedDepartmentCount, 0, 1));
}

function calculateDistanceScore(distanceKm: number | null) {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return 5;
  const normalized = 1 - clamp(distanceKm, 0, 20) / 20;
  return round(SCORE_WEIGHT.distance * normalized);
}

function calculateResponsivenessScore(avgResponseMinutes: number | null, respondedCount: number) {
  if (!respondedCount || avgResponseMinutes == null || !Number.isFinite(avgResponseMinutes)) return 8;
  const normalized = 1 - clamp(avgResponseMinutes, 5, 30) / 30;
  return round(SCORE_WEIGHT.responsiveness * normalized);
}

function calculateConversionScore(acceptableRate: number | null, respondedCount: number) {
  if (!respondedCount || acceptableRate == null || !Number.isFinite(acceptableRate)) return 5;
  return round(SCORE_WEIGHT.conversion * clamp(acceptableRate, 0, 1));
}

function calculateLoadPenalty(pendingTargets: number) {
  return round(clamp(pendingTargets * 3, 0, SCORE_WEIGHT.loadPenaltyMax));
}

async function getHospitalSearchMetrics(hospitalDbIds: number[]) {
  if (hospitalDbIds.length === 0) return new Map<number, HospitalSearchMetricsRow>();

  const result = await db.query<HospitalSearchMetricsRow>(
    `
      WITH scoped_hospitals AS (
        SELECT UNNEST($1::int[]) AS hospital_id
      ),
      recent_targets AS (
        SELECT
          t.id AS target_id,
          t.hospital_id,
          r.sent_at,
          t.responded_at
        FROM hospital_request_targets t
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        WHERE t.hospital_id = ANY($1::int[])
          AND r.sent_at >= NOW() - INTERVAL '30 days'
      ),
      event_flags AS (
        SELECT
          e.target_id,
          BOOL_OR(e.to_status = 'ACCEPTABLE') AS had_acceptable,
          BOOL_OR(e.to_status = 'NEGOTIATING') AS had_consult
        FROM hospital_request_events e
        JOIN recent_targets rt ON rt.target_id = e.target_id
        GROUP BY e.target_id
      ),
      current_backlog AS (
        SELECT
          t.hospital_id,
          COUNT(*) FILTER (WHERE t.status IN ('UNREAD', 'READ', 'NEGOTIATING'))::int AS pending_targets
        FROM hospital_request_targets t
        WHERE t.hospital_id = ANY($1::int[])
        GROUP BY t.hospital_id
      )
      SELECT
        sh.hospital_id,
        AVG(EXTRACT(EPOCH FROM (rt.responded_at - rt.sent_at)) / 60.0)
          FILTER (WHERE rt.responded_at IS NOT NULL AND rt.responded_at >= rt.sent_at) AS avg_response_minutes,
        COUNT(rt.target_id)
          FILTER (WHERE rt.responded_at IS NOT NULL AND rt.responded_at >= rt.sent_at)::int AS responded_count,
        COUNT(rt.target_id) FILTER (WHERE ef.had_acceptable)::int AS acceptable_count,
        COUNT(rt.target_id) FILTER (WHERE ef.had_consult)::int AS consult_count,
        COUNT(rt.target_id) FILTER (WHERE ef.had_consult AND ef.had_acceptable)::int AS consult_acceptable_count,
        COALESCE(cb.pending_targets, 0)::int AS pending_targets
      FROM scoped_hospitals sh
      LEFT JOIN recent_targets rt ON rt.hospital_id = sh.hospital_id
      LEFT JOIN event_flags ef ON ef.target_id = rt.target_id
      LEFT JOIN current_backlog cb ON cb.hospital_id = sh.hospital_id
      GROUP BY sh.hospital_id, cb.pending_targets
    `,
    [hospitalDbIds],
  );

  return new Map(result.rows.map((row) => [row.hospital_id, row]));
}

export async function scoreHospitalSearchCandidates(
  candidates: HospitalSearchCandidate[],
  selectedDepartments: string[],
): Promise<HospitalSearchScoredCandidate[]> {
  const metricsByHospital = await getHospitalSearchMetrics(candidates.map((candidate) => candidate.hospitalDbId));
  const selectedDepartmentCount = selectedDepartments.length;

  return [...candidates]
    .map((candidate) => {
      const metrics = metricsByHospital.get(candidate.hospitalDbId);
      const matchedDepartmentCount = candidate.departments.length;
      const acceptableRate =
        metrics && metrics.responded_count > 0 ? metrics.acceptable_count / metrics.responded_count : null;
      const availability = calculateAvailabilityScore(matchedDepartmentCount, selectedDepartmentCount);
      const distance = calculateDistanceScore(candidate.distanceKm);
      const responsiveness = calculateResponsivenessScore(metrics?.avg_response_minutes ?? null, metrics?.responded_count ?? 0);
      const conversion = calculateConversionScore(acceptableRate, metrics?.responded_count ?? 0);
      const loadPenalty = calculateLoadPenalty(metrics?.pending_targets ?? 0);
      const searchScore = round(availability + distance + responsiveness + conversion - loadPenalty);

      const scoreBreakdown: HospitalSearchScoreBreakdown = {
        availability,
        distance,
        responsiveness,
        conversion,
        loadPenalty,
        matchedDepartmentCount,
        selectedDepartmentCount,
        avgResponseMinutes: metrics?.avg_response_minutes ?? null,
        acceptableRate,
        pendingTargets: metrics?.pending_targets ?? 0,
      };

      const scoreSummary = [
        `科目一致 ${matchedDepartmentCount}/${selectedDepartmentCount || matchedDepartmentCount || 1}`,
        candidate.distanceKm == null ? "距離情報なし" : `距離 ${candidate.distanceKm.toFixed(1)}km`,
        formatMinutes(scoreBreakdown.avgResponseMinutes),
        formatConversion(scoreBreakdown.acceptableRate),
      ];
      if (scoreBreakdown.pendingTargets > 0) {
        scoreSummary.push(`滞留 ${scoreBreakdown.pendingTargets}件`);
      }

      return {
        ...candidate,
        searchScore,
        scoreBreakdown,
        scoreSummary,
      };
    })
    .sort((a, b) => {
      if (b.searchScore !== a.searchScore) return b.searchScore - a.searchScore;
      if (b.scoreBreakdown.availability !== a.scoreBreakdown.availability) {
        return b.scoreBreakdown.availability - a.scoreBreakdown.availability;
      }
      if (a.distanceKm != null && b.distanceKm != null && a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm == null && b.distanceKm != null) return 1;
      if (a.distanceKm != null && b.distanceKm == null) return -1;
      if (a.scoreBreakdown.avgResponseMinutes != null && b.scoreBreakdown.avgResponseMinutes != null) {
        if (a.scoreBreakdown.avgResponseMinutes !== b.scoreBreakdown.avgResponseMinutes) {
          return a.scoreBreakdown.avgResponseMinutes - b.scoreBreakdown.avgResponseMinutes;
        }
      } else if (a.scoreBreakdown.avgResponseMinutes == null && b.scoreBreakdown.avgResponseMinutes != null) {
        return 1;
      } else if (a.scoreBreakdown.avgResponseMinutes != null && b.scoreBreakdown.avgResponseMinutes == null) {
        return -1;
      }
      if (a.hospitalId !== b.hospitalId) return a.hospitalId - b.hospitalId;
      return a.hospitalName.localeCompare(b.hospitalName, "ja");
    });
}
