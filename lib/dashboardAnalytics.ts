import type { QueryResult, QueryResultRow } from "pg";

import { db } from "@/lib/db";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { compareHospitalPriority } from "@/lib/hospitalPriority";
import {
  CONSULT_STALLED_CRITICAL_MINUTES,
  CONSULT_STALLED_WARNING_MINUTES,
  SELECTION_STALLED_CRITICAL_MINUTES,
  SELECTION_STALLED_WARNING_MINUTES,
  listConsultStalledCandidates,
  listSelectionStalledCandidates,
} from "@/lib/operationalAlerts";

export type AnalyticsRangeKey = "today" | "7d" | "30d" | "90d";

export type AnalyticsSelectOption = {
  label: string;
  value: string;
};

export type EmsStatsFilters = {
  incidentType?: string;
  ageBucket?: string;
};

export type HospitalStatsFilters = {
  department?: string;
};

export type AdminStatsFilters = {
  incidentType?: string;
  ageBucket?: string;
};

type QueryableResult<T extends QueryResultRow> = Promise<QueryResult<T>>;

type BaseCaseRow = {
  case_uid: string;
  case_id: string;
  age: number | null;
  address: string | null;
  aware_date: string | null;
  aware_time: string | null;
  incident_type: string | null;
  team_name?: string | null;
  hospital_name?: string | null;
  request_row_id: number | null;
  sent_at: string | null;
  target_id: number | null;
  status: string | null;
  decided_at: string | null;
  responded_at?: string | null;
  had_consult?: boolean | null;
};

type HospitalRow = {
  target_id: number;
  request_id: string;
  case_id: string;
  patient_name: string | null;
  age: number | null;
  incident_type: string | null;
  team_name: string | null;
  sent_at: string;
  status: string;
  opened_at: string | null;
  responded_at: string | null;
  decided_at: string | null;
  selected_departments: unknown;
  consult_at: string | null;
  accept_after_consult_at: string | null;
};

export type DashboardKpi = {
  label: string;
  value: string;
  tone?: "blue" | "emerald" | "amber" | "rose" | "slate";
  hint?: string;
};

export type DistributionItem = {
  label: string;
  value: number;
  secondaryValue?: number;
  secondaryLabel?: string;
};

export type TrendPoint = {
  label: string;
  value: number;
  secondaryValue?: number;
};

export type PendingItem = {
  id: string;
  title: string;
  meta: string;
  status: string;
};

export type EmsDashboardData = {
  rangeLabel: string;
  activeFilters: Required<EmsStatsFilters>;
  filterOptions: {
    incidentTypes: AnalyticsSelectOption[];
    ageBuckets: AnalyticsSelectOption[];
  };
  kpis: DashboardKpi[];
  incidentCounts: DistributionItem[];
  transportByIncident: DistributionItem[];
  decisionTrend: TrendPoint[];
  ageGroups: DistributionItem[];
  hourlyDecision: TrendPoint[];
  weekdayDecision: TrendPoint[];
};

export type HospitalDashboardData = {
  rangeLabel: string;
  activeFilters: Required<HospitalStatsFilters>;
  filterOptions: {
    departments: AnalyticsSelectOption[];
  };
  backlogKpis: DashboardKpi[];
  timingKpis: DashboardKpi[];
  departmentRequests: DistributionItem[];
  departmentAcceptable: DistributionItem[];
  responseTrend: TrendPoint[];
  pendingItems: PendingItem[];
};

export type AdminDashboardData = {
  rangeLabel: string;
  activeFilters: Required<AdminStatsFilters>;
  filterOptions: {
    incidentTypes: AnalyticsSelectOption[];
    ageBuckets: AnalyticsSelectOption[];
  };
  kpis: DashboardKpi[];
  alerts: string[];
  incidentCounts: DistributionItem[];
  transportByIncident: DistributionItem[];
  topTeams: DistributionItem[];
  regionalDecision: DistributionItem[];
  ageGroups: DistributionItem[];
  hospitalDelay: DistributionItem[];
};

const RANGE_LABELS: Record<AnalyticsRangeKey, string> = {
  today: "今日",
  "7d": "直近7日",
  "30d": "直近30日",
  "90d": "直近90日",
};

export function parseAnalyticsRange(value: string | null | undefined): AnalyticsRangeKey {
  if (value === "today" || value === "7d" || value === "30d" || value === "90d") return value;
  return "30d";
}

function getRangeStart(range: AnalyticsRangeKey): Date {
  const now = new Date();
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  if (range === "today") return base;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  base.setDate(base.getDate() - (days - 1));
  return base;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function formatMinutes(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  const rounded = Math.round(value);
  if (rounded < 60) return `${rounded}分`;
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return minutes === 0 ? `${hours}時間` : `${hours}時間${minutes}分`;
}


function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function averageOfMapValues(map: Map<string, number[]>): number | null {
  const values = [...map.values()].flat();
  return average(values);
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAwareTimestamp(dateValue: string | null | undefined, timeValue: string | null | undefined): Date | null {
  if (!dateValue || !timeValue) return null;
  const normalizedTime = /^\d{2}:\d{2}$/.test(timeValue) ? `${timeValue}:00` : timeValue;
  const date = new Date(`${dateValue}T${normalizedTime}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function minutesBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  return (end.getTime() - start.getTime()) / 60000;
}

function topItems(map: Map<string, number>, limit = 8): DistributionItem[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

function buildTrend(points: Map<string, number[]>, orderedLabels: string[]): TrendPoint[] {
  return orderedLabels.map((label) => ({ label, value: Math.round(average(points.get(label) ?? []) ?? 0) }));
}

function ageBucket(age: number | null): string {
  if (age == null || !Number.isFinite(age)) return "不明";
  if (age < 18) return "0-17";
  if (age < 40) return "18-39";
  if (age < 65) return "40-64";
  if (age < 75) return "65-74";
  return "75+";
}

function addressArea(address: string | null | undefined): string {
  const text = String(address ?? "").trim();
  if (!text) return "不明";
  const match = text.match(/.*?(市|区|町|村)/);
  return match ? match[0] : text.slice(0, 12);
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

const AGE_BUCKET_ORDER = ["0-17", "18-39", "40-64", "65-74", "75+", "不明"];

function createSelectOptions(values: string[], preferredOrder?: string[]): AnalyticsSelectOption[] {
  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  unique.sort((a, b) => {
    if (preferredOrder) {
      const ai = preferredOrder.indexOf(a);
      const bi = preferredOrder.indexOf(b);
      if (ai >= 0 || bi >= 0) {
        if (ai < 0) return 1;
        if (bi < 0) return -1;
        return ai - bi;
      }
    }
    return a.localeCompare(b, "ja");
  });
  return [{ label: "すべて", value: "" }, ...unique.map((value) => ({ label: value, value }))];
}

function getDepartmentLabels(value: unknown): string[] {
  const departments = Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
  return departments.length > 0 ? departments : ["未設定"];
}

function normalizeEmsFilters(filters?: EmsStatsFilters): Required<EmsStatsFilters> {
  return {
    incidentType: String(filters?.incidentType ?? "").trim(),
    ageBucket: String(filters?.ageBucket ?? "").trim(),
  };
}

function normalizeHospitalFilters(filters?: HospitalStatsFilters): Required<HospitalStatsFilters> {
  return {
    department: String(filters?.department ?? "").trim(),
  };
}

function normalizeAdminFilters(filters?: AdminStatsFilters): Required<AdminStatsFilters> {
  return {
    incidentType: String(filters?.incidentType ?? "").trim(),
    ageBucket: String(filters?.ageBucket ?? "").trim(),
  };
}

function isAnalyticsSchemaCompatibilityError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  return code === "42703" || code === "42P01";
}

async function queryWithAnalyticsFallback<T extends QueryResultRow>(
  label: string,
  primary: () => QueryableResult<T>,
  fallback: () => QueryableResult<T>,
): Promise<T[]> {
  try {
    return (await primary()).rows;
  } catch (error) {
    if (!isAnalyticsSchemaCompatibilityError(error)) {
      throw error;
    }

    console.warn(`[analytics] ${label} fell back to legacy schema mode.`);
    return (await fallback()).rows;
  }
}

type EmsCaseAggregate = {
  caseUid: string;
  caseId: string;
  incidentType: string;
  age: number | null;
  awareAt: Date | null;
  firstSentAt: Date | null;
  firstDecidedAt: Date | null;
  inquiryCount: number;
  transported: boolean;
  hadConsult: boolean;
};

async function fetchEmsRows(teamId: number, from: Date): Promise<BaseCaseRow[]> {
  const params = [teamId, from.toISOString()];

  return queryWithAnalyticsFallback(
    "EMS dashboard query",
    () =>
      db.query<BaseCaseRow>(
        `
          SELECT
            c.case_uid,
            c.case_id,
            c.age,
            c.address,
            c.aware_date,
            c.aware_time,
            COALESCE(NULLIF(c.case_payload->'summary'->>'incidentType', ''), '未設定') AS incident_type,
            r.id AS request_row_id,
            r.sent_at::text AS sent_at,
            t.id AS target_id,
            t.status,
            t.decided_at::text AS decided_at,
            EXISTS (
              SELECT 1
              FROM hospital_request_events e
              WHERE e.target_id = t.id
                AND e.to_status = 'NEGOTIATING'
            ) AS had_consult
          FROM cases c
          LEFT JOIN hospital_requests r ON r.case_uid = c.case_uid
          LEFT JOIN hospital_request_targets t ON t.hospital_request_id = r.id
          WHERE c.team_id = $1
            AND COALESCE(r.sent_at, c.updated_at, c.created_at) >= $2
          ORDER BY c.case_uid, r.sent_at NULLS LAST, t.id NULLS LAST
        `,
        params,
      ),
    () =>
      db.query<BaseCaseRow>(
        `
          SELECT
            'case-' || LPAD(c.id::text, 10, '0') AS case_uid,
            c.case_id,
            c.age,
            c.address,
            c.aware_date,
            c.aware_time,
            '未設定' AS incident_type,
            r.id AS request_row_id,
            r.sent_at::text AS sent_at,
            t.id AS target_id,
            t.status,
            t.decided_at::text AS decided_at,
            EXISTS (
              SELECT 1
              FROM hospital_request_events e
              WHERE e.target_id = t.id
                AND e.to_status = 'NEGOTIATING'
            ) AS had_consult
          FROM cases c
          LEFT JOIN hospital_requests r ON r.case_id = c.case_id
          LEFT JOIN hospital_request_targets t ON t.hospital_request_id = r.id
          WHERE c.team_id = $1
            AND COALESCE(r.sent_at, c.created_at) >= $2
          ORDER BY c.case_id, r.sent_at NULLS LAST, t.id NULLS LAST
        `,
        params,
      ),
  );
}

function aggregateEmsCases(rows: BaseCaseRow[]): EmsCaseAggregate[] {
  const cases = new Map<string, EmsCaseAggregate>();
  const inquirySets = new Map<string, Set<number>>();

  for (const row of rows) {
    const aggregate = cases.get(row.case_uid) ?? {
      caseUid: row.case_uid,
      caseId: row.case_id,
      incidentType: row.incident_type || "未設定",
      age: row.age,
      awareAt: parseAwareTimestamp(row.aware_date, row.aware_time),
      firstSentAt: null,
      firstDecidedAt: null,
      inquiryCount: 0,
      transported: false,
      hadConsult: false,
    };

    const sentAt = toDate(row.sent_at);
    if (sentAt && (!aggregate.firstSentAt || sentAt < aggregate.firstSentAt)) {
      aggregate.firstSentAt = sentAt;
    }

    const decidedAt = toDate(row.decided_at);
    if (row.status === "TRANSPORT_DECIDED") {
      aggregate.transported = true;
      if (decidedAt && (!aggregate.firstDecidedAt || decidedAt < aggregate.firstDecidedAt)) {
        aggregate.firstDecidedAt = decidedAt;
      }
    }

    if (row.had_consult) {
      aggregate.hadConsult = true;
    }

    const inquirySet = inquirySets.get(row.case_uid) ?? new Set<number>();
    if (row.target_id != null) inquirySet.add(row.target_id);
    inquirySets.set(row.case_uid, inquirySet);
    aggregate.inquiryCount = inquirySet.size;
    cases.set(row.case_uid, aggregate);
  }

  return [...cases.values()];
}

export async function getEmsDashboardData(teamId: number, range: AnalyticsRangeKey, filters?: EmsStatsFilters): Promise<EmsDashboardData> {
  await ensureCasesColumns();
  await ensureHospitalRequestTables();
  const normalizedFilters = normalizeEmsFilters(filters);
  const from = getRangeStart(range);
  const rows = await fetchEmsRows(teamId, from);
  const allCases = aggregateEmsCases(rows);
  const cases = allCases.filter((item) => {
    if (normalizedFilters.incidentType && item.incidentType !== normalizedFilters.incidentType) return false;
    if (normalizedFilters.ageBucket && ageBucket(item.age) !== normalizedFilters.ageBucket) return false;
    return true;
  });

  const decisionMinutes = cases.map((item) => minutesBetween(item.firstSentAt, item.firstDecidedAt)).filter((value): value is number => value != null && value >= 0);
  const selectionMinutes = cases.map((item) => minutesBetween(item.awareAt, item.firstSentAt)).filter((value): value is number => value != null && value >= 0);
  const incidentCountsMap = new Map<string, number>();
  const incidentTransportMap = new Map<string, { transported: number; notTransported: number }>();
  const ageMap = new Map<string, number>();
  const dailyDecision = new Map<string, number[]>();
  const hourlyDecision = new Map<string, number[]>();
  const weekdayDecision = new Map<string, number[]>();

  for (const item of cases) {
    increment(incidentCountsMap, item.incidentType || "未設定");
    const transport = incidentTransportMap.get(item.incidentType || "未設定") ?? { transported: 0, notTransported: 0 };
    if (item.transported) transport.transported += 1;
    else transport.notTransported += 1;
    incidentTransportMap.set(item.incidentType || "未設定", transport);
    increment(ageMap, ageBucket(item.age));

    const decision = minutesBetween(item.firstSentAt, item.firstDecidedAt);
    if (decision != null && item.firstSentAt) {
      const dayKey = item.firstSentAt.toISOString().slice(5, 10);
      const hourKey = `${String(item.firstSentAt.getHours()).padStart(2, "0")}時`;
      const weekdayKey = ["日", "月", "火", "水", "木", "金", "土"][item.firstSentAt.getDay()];
      const dayValues = dailyDecision.get(dayKey) ?? [];
      dayValues.push(decision);
      dailyDecision.set(dayKey, dayValues);
      const hourValues = hourlyDecision.get(hourKey) ?? [];
      hourValues.push(decision);
      hourlyDecision.set(hourKey, hourValues);
      const weekdayValues = weekdayDecision.get(weekdayKey) ?? [];
      weekdayValues.push(decision);
      weekdayDecision.set(weekdayKey, weekdayValues);
    }
  }

  const transportedCount = cases.filter((item) => item.transported).length;
  const resendCount = cases.filter((item) => item.inquiryCount > 1).length;
  const consultCount = cases.filter((item) => item.hadConsult).length;

  return {
    rangeLabel: RANGE_LABELS[range],
    activeFilters: normalizedFilters,
    filterOptions: {
      incidentTypes: createSelectOptions(allCases.map((item) => item.incidentType)),
      ageBuckets: createSelectOptions(allCases.map((item) => ageBucket(item.age)), AGE_BUCKET_ORDER),
    },
    kpis: [
      { label: "覚知〜初回照会 平均", value: formatMinutes(average(selectionMinutes)), tone: "amber" },
      { label: "覚知〜初回照会 中央値", value: formatMinutes(median(selectionMinutes)), tone: "slate" },
      { label: "送信〜HP決定 平均", value: formatMinutes(average(decisionMinutes)), tone: "blue" },
      { label: "送信〜HP決定 中央値", value: formatMinutes(median(decisionMinutes)), tone: "emerald" },
      { label: "相談移行率", value: formatPercent(consultCount, cases.length), tone: "blue", hint: `${consultCount}件が相談へ移行` },
      { label: "再送信率", value: formatPercent(resendCount, cases.length), tone: "rose", hint: `搬送決定 ${transportedCount}件` },
    ],
    incidentCounts: topItems(incidentCountsMap, 12),
    transportByIncident: [...incidentTransportMap.entries()]
      .sort((a, b) => (b[1].transported + b[1].notTransported) - (a[1].transported + a[1].notTransported))
      .slice(0, 12)
      .map(([label, value]) => ({ label, value: value.transported, secondaryValue: value.notTransported, secondaryLabel: "不搬送" })),
    decisionTrend: buildTrend(dailyDecision, [...dailyDecision.keys()].sort()),
    ageGroups: topItems(ageMap, 8),
    hourlyDecision: buildTrend(hourlyDecision, Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, "0")}時`)),
    weekdayDecision: buildTrend(weekdayDecision, ["月", "火", "水", "木", "金", "土", "日"]),
  };
}

export async function getHospitalDashboardData(hospitalId: number, range: AnalyticsRangeKey, filters?: HospitalStatsFilters): Promise<HospitalDashboardData> {
  await ensureCasesColumns();
  await ensureHospitalRequestTables();
  const normalizedFilters = normalizeHospitalFilters(filters);
  const from = getRangeStart(range);
  const allRows = await queryWithAnalyticsFallback(
    "Hospital dashboard query",
    () =>
      db.query<HospitalRow>(
        `
          SELECT
            t.id AS target_id,
            r.request_id,
            r.case_id,
            c.patient_name,
            c.age,
            COALESCE(NULLIF(c.case_payload->'summary'->>'incidentType', ''), '未設定') AS incident_type,
            et.team_name,
            r.sent_at::text AS sent_at,
            t.status,
            t.opened_at::text AS opened_at,
            t.responded_at::text AS responded_at,
            t.decided_at::text AS decided_at,
            t.selected_departments,
            consult_event.consult_at::text AS consult_at,
            accept_event.accept_after_consult_at::text AS accept_after_consult_at
          FROM hospital_request_targets t
          JOIN hospital_requests r ON r.id = t.hospital_request_id
          LEFT JOIN cases c ON c.case_uid = r.case_uid
          LEFT JOIN emergency_teams et ON et.id = r.from_team_id
          LEFT JOIN LATERAL (
            SELECT MIN(e.acted_at) AS consult_at
            FROM hospital_request_events e
            WHERE e.target_id = t.id
              AND e.to_status = 'NEGOTIATING'
          ) consult_event ON TRUE
          LEFT JOIN LATERAL (
            SELECT MIN(e.acted_at) AS accept_after_consult_at
            FROM hospital_request_events e
            WHERE e.target_id = t.id
              AND e.to_status = 'ACCEPTABLE'
              AND (consult_event.consult_at IS NULL OR e.acted_at >= consult_event.consult_at)
          ) accept_event ON TRUE
          WHERE t.hospital_id = $1
            AND r.sent_at >= $2
          ORDER BY r.sent_at DESC, t.id DESC
        `,
        [hospitalId, from.toISOString()],
      ),
    () =>
      db.query<HospitalRow>(
        `
          SELECT
            t.id AS target_id,
            r.request_id,
            r.case_id,
            c.patient_name,
            c.age,
            '未設定' AS incident_type,
            et.team_name,
            r.sent_at::text AS sent_at,
            t.status,
            t.opened_at::text AS opened_at,
            t.responded_at::text AS responded_at,
            t.decided_at::text AS decided_at,
            '[]'::jsonb AS selected_departments,
            consult_event.consult_at::text AS consult_at,
            accept_event.accept_after_consult_at::text AS accept_after_consult_at
          FROM hospital_request_targets t
          JOIN hospital_requests r ON r.id = t.hospital_request_id
          LEFT JOIN cases c ON c.case_id = r.case_id
          LEFT JOIN emergency_teams et ON et.id = r.from_team_id
          LEFT JOIN LATERAL (
            SELECT MIN(e.acted_at) AS consult_at
            FROM hospital_request_events e
            WHERE e.target_id = t.id
              AND e.to_status = 'NEGOTIATING'
          ) consult_event ON TRUE
          LEFT JOIN LATERAL (
            SELECT MIN(e.acted_at) AS accept_after_consult_at
            FROM hospital_request_events e
            WHERE e.target_id = t.id
              AND e.to_status = 'ACCEPTABLE'
              AND (consult_event.consult_at IS NULL OR e.acted_at >= consult_event.consult_at)
          ) accept_event ON TRUE
          WHERE t.hospital_id = $1
            AND r.sent_at >= $2
          ORDER BY r.sent_at DESC, t.id DESC
        `,
        [hospitalId, from.toISOString()],
      ),
  );

  const rows = allRows.filter((row) => {
    if (!normalizedFilters.department) return true;
    return getDepartmentLabels(row.selected_departments).includes(normalizedFilters.department);
  });

  const unreadCount = rows.filter((row) => row.status === "UNREAD").length;
  const readPendingCount = rows.filter((row) => row.status === "READ").length;
  const consultWaitingCount = rows.filter((row) => row.status === "NEGOTIATING").length;
  const backlogCount = unreadCount + readPendingCount + consultWaitingCount;
  const acceptableCount = rows.filter((row) => row.status === "ACCEPTABLE").length;
  const notAcceptableCount = rows.filter((row) => row.status === "NOT_ACCEPTABLE").length;

  const receiveToRead = rows.map((row) => minutesBetween(toDate(row.sent_at), toDate(row.opened_at))).filter((value): value is number => value != null && value >= 0);
  const readToReply = rows.map((row) => minutesBetween(toDate(row.opened_at), toDate(row.responded_at))).filter((value): value is number => value != null && value >= 0);

  const departmentRequestMap = new Map<string, number>();
  const departmentAcceptableMap = new Map<string, number>();
  const dailyResponse = new Map<string, number[]>();

  for (const row of rows) {
    const labels = getDepartmentLabels(row.selected_departments);
    for (const label of labels) {
      increment(departmentRequestMap, label || "未設定");
      if (row.status === "ACCEPTABLE") increment(departmentAcceptableMap, label || "未設定");
    }

    const replyMinutes = minutesBetween(toDate(row.opened_at), toDate(row.responded_at));
    const sentAt = toDate(row.sent_at);
    if (replyMinutes != null && sentAt) {
      const key = sentAt.toISOString().slice(5, 10);
      const bucket = dailyResponse.get(key) ?? [];
      bucket.push(replyMinutes);
      dailyResponse.set(key, bucket);
    }
  }

  const consultCount = rows.filter((row) => toDate(row.consult_at) != null).length;
  const consultAcceptedCount = rows.filter((row) => toDate(row.accept_after_consult_at) != null).length;
  const topDepartment = [...departmentRequestMap.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))[0];

  const pendingItems = rows
    .filter((row) => row.status === "UNREAD" || row.status === "READ" || row.status === "NEGOTIATING")
    .sort((a, b) => {
      const priority = compareHospitalPriority(
        {
          status: a.status,
          sentAt: a.sent_at,
          openedAt: a.opened_at,
          consultAt: a.consult_at,
          respondedAt: a.responded_at,
        },
        {
          status: b.status,
          sentAt: b.sent_at,
          openedAt: b.opened_at,
          consultAt: b.consult_at,
          respondedAt: b.responded_at,
        },
      );
      if (priority !== 0) return priority;
      return a.target_id - b.target_id;
    })
    .slice(0, 5)
    .map((row) => ({
      id: String(row.target_id),
      title: `${row.case_id} / ${row.patient_name || "氏名不明"}`,
      meta: `${row.team_name || "救急隊不明"} / ${row.incident_type || "未設定"}`,
      status: row.status === "UNREAD" ? "未読" : row.status === "READ" ? "既読未返信" : "相談待ち",
    }));

  return {
    rangeLabel: RANGE_LABELS[range],
    activeFilters: normalizedFilters,
    filterOptions: {
      departments: createSelectOptions(allRows.flatMap((row) => getDepartmentLabels(row.selected_departments))),
    },
    backlogKpis: [
      {
        label: "backlog件数",
        value: String(backlogCount),
        tone: backlogCount > 0 ? "amber" : "emerald",
        hint: `未読 ${unreadCount} / 既読未返信 ${readPendingCount} / 相談待ち ${consultWaitingCount}`,
      },
      {
        label: "科別依頼件数",
        value: String(rows.length),
        tone: "blue",
        hint: topDepartment ? `最多 ${topDepartment[0]} ${topDepartment[1]}件` : "対象期間の依頼なし",
      },
      {
        label: "相談後受入率",
        value: formatPercent(consultAcceptedCount, consultCount),
        tone: "emerald",
        hint: `相談 ${consultCount}件 / 受入可能 ${consultAcceptedCount}件`,
      },
      {
        label: "受入可能件数",
        value: String(acceptableCount),
        tone: "emerald",
        hint: `受入不可 ${notAcceptableCount}件`,
      },
    ],
    timingKpis: [
      { label: "受信〜既読 平均", value: formatMinutes(average(receiveToRead)), tone: "blue" },
      { label: "受信〜既読 中央値", value: formatMinutes(median(receiveToRead)), tone: "emerald" },
      { label: "既読〜返信 平均", value: formatMinutes(average(readToReply)), tone: "amber" },
      { label: "既読〜返信 中央値", value: formatMinutes(median(readToReply)), tone: "slate" },
    ],
    departmentRequests: topItems(departmentRequestMap, 10),
    departmentAcceptable: topItems(departmentAcceptableMap, 10),
    responseTrend: buildTrend(dailyResponse, [...dailyResponse.keys()].sort()),
    pendingItems,
  };
}

export async function getAdminDashboardData(range: AnalyticsRangeKey, filters?: AdminStatsFilters): Promise<AdminDashboardData> {
  await ensureCasesColumns();
  await ensureHospitalRequestTables();
  const normalizedFilters = normalizeAdminFilters(filters);
  const from = getRangeStart(range);
  const allRows = await queryWithAnalyticsFallback(
    "Admin dashboard query",
    () =>
      db.query<BaseCaseRow>(
        `
          SELECT
            c.case_uid,
            c.case_id,
            c.age,
            c.address,
            c.aware_date,
            c.aware_time,
            COALESCE(NULLIF(c.case_payload->'summary'->>'incidentType', ''), '未設定') AS incident_type,
            et.team_name,
            h.name AS hospital_name,
            r.id AS request_row_id,
            r.sent_at::text AS sent_at,
            t.id AS target_id,
            t.status,
            t.decided_at::text AS decided_at,
            t.responded_at::text AS responded_at
          FROM cases c
          LEFT JOIN emergency_teams et ON et.id = c.team_id
          LEFT JOIN hospital_requests r ON r.case_uid = c.case_uid
          LEFT JOIN hospital_request_targets t ON t.hospital_request_id = r.id
          LEFT JOIN hospitals h ON h.id = t.hospital_id
          WHERE COALESCE(r.sent_at, c.updated_at, c.created_at) >= $1
          ORDER BY c.case_uid, r.sent_at NULLS LAST, t.id NULLS LAST
        `,
        [from.toISOString()],
      ),
    () =>
      db.query<BaseCaseRow>(
        `
          SELECT
            'case-' || LPAD(c.id::text, 10, '0') AS case_uid,
            c.case_id,
            c.age,
            c.address,
            c.aware_date,
            c.aware_time,
            '未設定' AS incident_type,
            et.team_name,
            h.name AS hospital_name,
            r.id AS request_row_id,
            r.sent_at::text AS sent_at,
            t.id AS target_id,
            t.status,
            t.decided_at::text AS decided_at,
            t.responded_at::text AS responded_at
          FROM cases c
          LEFT JOIN emergency_teams et ON et.id = c.team_id
          LEFT JOIN hospital_requests r ON r.case_id = c.case_id
          LEFT JOIN hospital_request_targets t ON t.hospital_request_id = r.id
          LEFT JOIN hospitals h ON h.id = t.hospital_id
          WHERE COALESCE(r.sent_at, c.created_at) >= $1
          ORDER BY c.case_id, r.sent_at NULLS LAST, t.id NULLS LAST
        `,
        [from.toISOString()],
      ),
  );

  const allCases = aggregateEmsCases(allRows);
  const cases = allCases.filter((item) => {
    if (normalizedFilters.incidentType && item.incidentType !== normalizedFilters.incidentType) return false;
    if (normalizedFilters.ageBucket && ageBucket(item.age) !== normalizedFilters.ageBucket) return false;
    return true;
  });
  const caseUidSet = new Set(cases.map((item) => item.caseUid));
  const rows = allRows.filter((row) => caseUidSet.has(row.case_uid));
  const totalCases = cases.length;
  const decidedCases = cases.filter((item) => item.transported).length;
  const inProgressCases = cases.filter((item) => item.inquiryCount > 0 && !item.transported).length;
  const difficultCases = cases.filter((item) => item.inquiryCount >= 4 || (!item.transported && (minutesBetween(item.firstSentAt, new Date()) ?? 0) >= 30)).length;
  const pendingTargets = rows.filter((row) => row.status === "UNREAD" || row.status === "READ" || row.status === "NEGOTIATING").length;
  const caseLookup = new Map<string, BaseCaseRow>();
  const decisionMinutes = cases.map((item) => minutesBetween(item.firstSentAt, item.firstDecidedAt)).filter((value): value is number => value != null && value >= 0);

  const incidentCountsMap = new Map<string, number>();
  const incidentTransportMap = new Map<string, { transported: number; notTransported: number }>();
  const teamMap = new Map<string, number>();
  const regionDecisionMap = new Map<string, number[]>();
  const ageMap = new Map<string, number>();
  const hospitalDelayMap = new Map<string, number[]>();

  for (const row of rows) {
    if (!caseLookup.has(row.case_uid)) {
      caseLookup.set(row.case_uid, row);
    }
    const delay = minutesBetween(toDate(row.sent_at), toDate(row.responded_at));
    if (delay != null) {
      const hospitalKey = row.hospital_name || "病院不明";
      const hospitalValues = hospitalDelayMap.get(hospitalKey) ?? [];
      hospitalValues.push(delay);
      hospitalDelayMap.set(hospitalKey, hospitalValues);
    }
  }

  for (const item of cases) {
    const key = item.incidentType || "未設定";
    const row = caseLookup.get(item.caseUid);
    increment(incidentCountsMap, key);
    increment(teamMap, row?.team_name || "未設定");
    increment(ageMap, ageBucket(item.age));
    const transport = incidentTransportMap.get(key) ?? { transported: 0, notTransported: 0 };
    if (item.transported) transport.transported += 1;
    else transport.notTransported += 1;
    incidentTransportMap.set(key, transport);
    const area = addressArea(row?.address);
    const decision = minutesBetween(item.firstSentAt, item.firstDecidedAt);
    if (decision != null) {
      const areaValues = regionDecisionMap.get(area) ?? [];
      areaValues.push(decision);
      regionDecisionMap.set(area, areaValues);
    }
  }

  const alerts: string[] = [];
  const [selectionStalled, consultStalled] = await Promise.all([
    listSelectionStalledCandidates(undefined, "LIVE"),
    listConsultStalledCandidates(undefined, undefined, "LIVE"),
  ]);
  const selectionCriticalCount = selectionStalled.filter((item) => item.severity === "critical").length;
  const selectionWarningCount = selectionStalled.filter((item) => item.severity === "warning").length;
  const consultCriticalCount = consultStalled.filter((item) => item.severity === "critical").length;
  const consultWarningCount = consultStalled.filter((item) => item.severity === "warning").length;

  if (selectionCriticalCount > 0) {
    alerts.push(
      `搬送先選定の長時間停滞が ${selectionCriticalCount} 件あります。${SELECTION_STALLED_CRITICAL_MINUTES} 分以上未決定です。`,
    );
  } else if (selectionWarningCount > 0) {
    alerts.push(
      `搬送先選定の停滞が ${selectionWarningCount} 件あります。${SELECTION_STALLED_WARNING_MINUTES} 分以上進展がありません。`,
    );
  }

  if (consultCriticalCount > 0) {
    alerts.push(
      `要相談案件の長時間停滞が ${consultCriticalCount} 件あります。${CONSULT_STALLED_CRITICAL_MINUTES} 分以上更新がありません。`,
    );
  } else if (consultWarningCount > 0) {
    alerts.push(
      `要相談案件の停滞が ${consultWarningCount} 件あります。${CONSULT_STALLED_WARNING_MINUTES} 分以上更新がありません。`,
    );
  }

  if (difficultCases > 0) alerts.push(`難渋事案が ${difficultCases} 件あります。`);
  const slowHospitals = [...hospitalDelayMap.entries()].map(([label, values]) => ({ label, avg: average(values) ?? 0, count: values.length })).filter((item) => item.count >= 2 && item.avg >= 15).sort((a, b) => b.avg - a.avg).slice(0, 3);
  for (const item of slowHospitals) {
    alerts.push(`${item.label} の平均返信時間が ${formatMinutes(item.avg)} です。`);
  }
  if (alerts.length === 0) alerts.push("大きな滞留アラートは検知されていません。");

  const averageHospitalDelay = averageOfMapValues(hospitalDelayMap);
  const averageRegionalDecision = averageOfMapValues(regionDecisionMap);

  return {
    rangeLabel: RANGE_LABELS[range],
    activeFilters: normalizedFilters,
    filterOptions: {
      incidentTypes: createSelectOptions(allCases.map((item) => item.incidentType)),
      ageBuckets: createSelectOptions(allCases.map((item) => ageBucket(item.age)), AGE_BUCKET_ORDER),
    },
    kpis: [
      { label: "全体搬送決定率", value: formatPercent(decidedCases, totalCases), tone: "blue", hint: `${decidedCases} / ${totalCases}件` },
      { label: "難渋事案件数", value: String(difficultCases), tone: "rose", hint: `進行中 ${inProgressCases}件` },
      { label: "未対応滞留件数", value: String(pendingTargets), tone: "amber" },
      { label: "病院別平均返信時間", value: formatMinutes(averageHospitalDelay), tone: "slate" },
      { label: "地域別搬送決定時間", value: formatMinutes(averageRegionalDecision), tone: "emerald", hint: `全体平均 ${formatMinutes(average(decisionMinutes))}` },
      { label: "全体件数", value: String(totalCases), tone: "blue", hint: RANGE_LABELS[range] },
    ],
    alerts,
    incidentCounts: topItems(incidentCountsMap, 10),
    transportByIncident: [...incidentTransportMap.entries()]
      .sort((a, b) => (b[1].transported + b[1].notTransported) - (a[1].transported + a[1].notTransported))
      .slice(0, 10)
      .map(([label, value]) => ({ label, value: value.transported, secondaryValue: value.notTransported, secondaryLabel: "不搬送" })),
    topTeams: topItems(teamMap, 10),
    regionalDecision: [...regionDecisionMap.entries()].map(([label, values]) => ({ label, value: Math.round(average(values) ?? 0) })).sort((a, b) => b.value - a.value).slice(0, 10),
    ageGroups: topItems(ageMap, 8),
    hospitalDelay: [...hospitalDelayMap.entries()].map(([label, values]) => ({ label, value: Math.round(average(values) ?? 0) })).sort((a, b) => b.value - a.value).slice(0, 10),
  };
}
