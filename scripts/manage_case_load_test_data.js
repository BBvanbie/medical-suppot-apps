/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg");
const { readDatabaseUrl } = require("./db_url");

const LOAD_CASE_ID_PREFIX = "LOAD-CASE-20260401-";
const LOAD_CASE_UID_PREFIX = "loadtest-20260401-";
const LOAD_REQUEST_PREFIX = "LOAD-REQ-20260401-";
const LOAD_BATCH = "2026-04-01-bulk";
const DEFAULT_CASE_COUNT = 100;
const DEFAULT_SEED_CHUNK_SIZE = 100;
const DEFAULT_DEPARTMENTS = ["内科", "外科", "整形外科", "脳神経外科", "循環器内科", "小児科"];
const E2E_TEAM_CODES = new Set(["E2E-TEAM-A", "E2E-TEAM-B"]);
const E2E_HOSPITAL_SOURCE_NOS = new Set([990001, 990002]);

const PATIENT_NAMES = [
  "山田 太郎",
  "佐藤 花子",
  "鈴木 一郎",
  "高橋 美咲",
  "田中 健",
  "伊藤 由美",
  "渡辺 直樹",
  "中村 彩",
  "小林 真一",
  "加藤 優奈",
];

const SYMPTOMS = ["胸痛", "呼吸苦", "意識障害", "腹痛", "頭痛", "発熱", "転倒外傷", "痙攣後", "腰背部痛", "めまい"];
const INCIDENT_TYPES = ["急病", "交通事故", "転倒", "労災", "心肺停止疑い", "意識障害"];
const GENDERS = ["male", "female"];
const MUNICIPALITIES = ["千代田区", "中央区", "港区", "新宿区", "文京区", "台東区"];
const STREETS = ["霞が関", "八重洲", "芝浦", "西新宿", "本郷", "上野"];

const SCENARIO_TEMPLATES = [
  { key: "unsent_case", label: "未送信事案", requestPattern: [] },
  { key: "unread_single", label: "単一送信未読", requestPattern: [{ status: "UNREAD" }] },
  { key: "read_pending", label: "既読保留", requestPattern: [{ status: "READ" }, { status: "UNREAD" }] },
  {
    key: "negotiating_with_reply",
    label: "要相談とEMS返信",
    requestPattern: [{ status: "NEGOTIATING", consult: true, emsReply: true }, { status: "READ" }],
  },
  { key: "acceptable_candidate", label: "受入可能候補", requestPattern: [{ status: "ACCEPTABLE" }, { status: "READ" }] },
  {
    key: "not_acceptable_reason",
    label: "受入不可理由あり",
    requestPattern: [{ status: "NOT_ACCEPTABLE", reasonCode: "NO_BEDS", reasonText: "ICU満床のため当直帯は受入停止" }, { status: "READ" }],
  },
  {
    key: "transport_decided",
    label: "搬送決定済み",
    requestPattern: [
      { status: "TRANSPORT_DECIDED", reasonCode: "TRANSFERRED_TO_OTHER_HOSPITAL" },
      { status: "TRANSPORT_DECLINED", reasonCode: "TRANSFERRED_TO_OTHER_HOSPITAL" },
      { status: "TRANSPORT_DECLINED", reasonCode: "TRANSFERRED_TO_OTHER_HOSPITAL" },
    ],
  },
  {
    key: "selection_stalled",
    label: "選定停滞",
    requestPattern: [{ status: "UNREAD", staleMinutes: 38 }, { status: "READ", staleMinutes: 34 }],
  },
  {
    key: "consult_stalled",
    label: "相談停滞",
    requestPattern: [{ status: "NEGOTIATING", consult: true, staleMinutes: 26 }, { status: "READ", staleMinutes: 24 }],
  },
  {
    key: "dispatch_mixed",
    label: "指令起票混在",
    requestPattern: [
      { status: "READ" },
      { status: "ACCEPTABLE" },
      { status: "NOT_ACCEPTABLE", reasonCode: "RECOMMEND_OTHER_DEPARTMENT", reasonText: "脳神経外科対応病院を推奨" },
    ],
    dispatchOrigin: true,
  },
];

function parseArgs(argv) {
  const [command = "summary", ...rest] = argv;
  const args = {
    command,
    dryRun: false,
    caseCount: DEFAULT_CASE_COUNT,
    expected: DEFAULT_CASE_COUNT,
    seedChunkSize: DEFAULT_SEED_CHUNK_SIZE,
    preferredHospitalSourceNos: [],
  };

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === "--dry-run") args.dryRun = true;
    if (token === "--count") args.caseCount = Number(rest[index + 1] ?? args.caseCount);
    if (token === "--expected") args.expected = Number(rest[index + 1] ?? args.expected);
    if (token === "--chunk-size") args.seedChunkSize = Number(rest[index + 1] ?? args.seedChunkSize);
    if (token === "--preferred-hospital-source-nos") {
      const value = String(rest[index + 1] ?? "");
      args.preferredHospitalSourceNos = value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item) && item > 0);
    }
  }

  if (!Number.isFinite(args.caseCount) || args.caseCount <= 0) {
    throw new Error("--count must be a positive number");
  }
  if (!Number.isFinite(args.expected) || args.expected <= 0) {
    throw new Error("--expected must be a positive number");
  }
  if (!Number.isFinite(args.seedChunkSize) || args.seedChunkSize <= 0) {
    throw new Error("--chunk-size must be a positive number");
  }

  return args;
}

function pad(value) {
  return String(value).padStart(3, "0");
}

function isoMinutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function isoMinutesAfter(value, minutes) {
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString();
}

function pick(list, index) {
  return list[index % list.length];
}

function prioritizeRows(rows, predicate) {
  const preferred = rows.filter(predicate);
  const others = rows.filter((row) => !predicate(row));
  return [...preferred, ...others];
}

function chunkScenario(index) {
  const scenarioIndex = Math.floor(index / 10) % SCENARIO_TEMPLATES.length;
  const variant = index % 10;
  return { scenario: SCENARIO_TEMPLATES[scenarioIndex], variant };
}

async function getCaseDataCounts(client) {
  const [cases, requests, targets, events, patients, notifications, loadCases] = await Promise.all([
    client.query("SELECT COUNT(*)::int AS count FROM cases"),
    client.query("SELECT COUNT(*)::int AS count FROM hospital_requests"),
    client.query("SELECT COUNT(*)::int AS count FROM hospital_request_targets"),
    client.query("SELECT COUNT(*)::int AS count FROM hospital_request_events"),
    client.query("SELECT COUNT(*)::int AS count FROM hospital_patients"),
    client.query("SELECT COUNT(*)::int AS count FROM notifications WHERE case_id IS NOT NULL OR case_uid IS NOT NULL OR target_id IS NOT NULL"),
    client.query("SELECT COUNT(*)::int AS count FROM cases WHERE case_id LIKE $1", [`${LOAD_CASE_ID_PREFIX}%`]),
  ]);

  return {
    cases: cases.rows[0].count,
    hospitalRequests: requests.rows[0].count,
    hospitalRequestTargets: targets.rows[0].count,
    hospitalRequestEvents: events.rows[0].count,
    hospitalPatients: patients.rows[0].count,
    caseNotifications: notifications.rows[0].count,
    loadCases: loadCases.rows[0].count,
  };
}

async function resetCaseOperationalData(client, dryRun) {
  const before = await getCaseDataCounts(client);
  if (dryRun) {
    return { mode: "dry-run", before };
  }

  await client.query("BEGIN");
  try {
    await client.query(`
      DELETE FROM notifications
      WHERE case_id IS NOT NULL
         OR case_uid IS NOT NULL
         OR target_id IS NOT NULL
    `);
    await client.query("DELETE FROM hospital_patients");
    await client.query("DELETE FROM hospital_request_events");
    await client.query("DELETE FROM hospital_request_targets");
    await client.query("DELETE FROM hospital_requests");
    await client.query("DELETE FROM cases");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }

  const after = await getCaseDataCounts(client);
  return { mode: "apply", before, after };
}

async function loadReferenceData(client, options = {}) {
  const preferredHospitalSourceNos = Array.isArray(options.preferredHospitalSourceNos)
    ? options.preferredHospitalSourceNos
    : [];
  const [teamsRes, hospitalsRes, departmentsRes] = await Promise.all([
    client.query(`
      SELECT id, team_code, team_name, division, COALESCE(case_number_code, LPAD(id::text, 3, '0')) AS case_number_code
      FROM emergency_teams
      ORDER BY id ASC
    `),
    client.query(`
      SELECT id, source_no, name, municipality, address
      FROM hospitals
      ORDER BY id ASC
    `),
    client
      .query("SELECT id, name FROM medical_departments ORDER BY id ASC")
      .catch(() => ({ rows: DEFAULT_DEPARTMENTS.map((name, idx) => ({ id: idx + 1, name })) })),
  ]);

  if (teamsRes.rows.length < 4) {
    throw new Error("Not enough emergency_teams rows to create load test data.");
  }
  if (hospitalsRes.rows.length < 4) {
    throw new Error("Not enough hospitals rows to create load test data.");
  }

  const loadTeams = teamsRes.rows.filter((row) => !E2E_TEAM_CODES.has(row.team_code));
  const loadHospitals = hospitalsRes.rows.filter((row) => !E2E_HOSPITAL_SOURCE_NOS.has(row.source_no));
  if (loadTeams.length < 4) {
    throw new Error("Not enough non-E2E emergency_teams rows to create load test data.");
  }
  if (loadHospitals.length < 4) {
    throw new Error("Not enough non-E2E hospitals rows to create load test data.");
  }

  return {
    teams: loadTeams,
    hospitals: prioritizeRows(
      loadHospitals,
      (row) =>
        preferredHospitalSourceNos.includes(row.source_no) && !E2E_HOSPITAL_SOURCE_NOS.has(row.source_no),
    ),
    departments: departmentsRes.rows.map((row) => row.name).filter(Boolean),
  };
}

function buildCasePayload(input) {
  const gender = pick(GENDERS, input.index);
  const incidentType = pick(INCIDENT_TYPES, input.index);
  const selectedDepartments = input.selectedDepartments;
  return {
    basic: {
      caseId: input.caseId,
      patientName: input.patientName,
      gender,
      age: input.age,
      awareDate: input.awareDate,
      awareTime: input.awareTime,
      address: input.address,
      symptom: input.symptom,
    },
    summary: {
      caseId: input.caseId,
      incidentType,
      chiefComplaint: input.symptom,
      severity: input.severity,
      teamCode: input.team.team_code,
      teamName: input.team.team_name,
      selectedDepartments,
      memo: input.note,
    },
    transport: {
      destinationPreference: input.destinationPreference,
      requiredDepartment: selectedDepartments[0] ?? null,
      searchMode: input.index % 2 === 0 ? "or" : "and",
    },
    vitals: {
      systolicBloodPressure: 90 + (input.index % 6) * 8,
      heartRate: 72 + (input.index % 7) * 5,
      spo2: 91 + (input.index % 6),
      respiratoryRate: 16 + (input.index % 5),
      temperature: 36.4 + (input.index % 4) * 0.3,
      consciousness: ["JCS0", "JCS1", "JCS2", "JCS3"][input.index % 4],
    },
    dispatch: input.scenario.dispatchOrigin
      ? {
          createdBy: "DISPATCH",
          sourceAddress: input.address,
          dispatchMemo: "指令センター起票の負荷試験データ",
        }
      : undefined,
    loadTest: {
      batch: LOAD_BATCH,
      scenarioKey: input.scenario.key,
      scenarioLabel: input.scenario.label,
      variant: input.variant,
    },
    sendHistory: [],
  };
}

function buildCaseRecord(reference, index) {
  const { scenario, variant } = chunkScenario(index);
  const team = reference.teams[index % Math.min(reference.teams.length, 8)];
  const municipality = pick(MUNICIPALITIES, index);
  const street = pick(STREETS, index);
  const patientName = pick(PATIENT_NAMES, index);
  const symptom = pick(SYMPTOMS, index);
  const caseId = `${LOAD_CASE_ID_PREFIX}${pad(index + 1)}`;
  const caseUid = `${LOAD_CASE_UID_PREFIX}${pad(index + 1)}`;
  const awareDate = `4/${String((index % 28) + 1).padStart(2, "0")}`;
  const awareTime = `${String(7 + (index % 12)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`;
  const address = `${municipality}${street}${(index % 6) + 1}-${(index % 9) + 1}-${(index % 12) + 1}`;
  const age = 18 + ((index * 3) % 73);
  const note = `${scenario.label}の負荷試験データ。搬送判断、通知、一覧比較を確認するための詳細メモを含みます。`;
  const selectedDepartments = [
    pick(reference.departments, index),
    pick(reference.departments, index + 2),
  ].filter((value, pos, array) => value && array.indexOf(value) === pos);
  const destinationPreference = scenario.key === "transport_decided" ? "受入可能病院を優先" : "近隣候補を比較";
  const payload = buildCasePayload({
    index,
    variant,
    caseId,
    patientName,
    age,
    awareDate,
    awareTime,
    address,
    symptom,
    severity: index % 5 === 0 ? "high" : index % 3 === 0 ? "medium" : "standard",
    team,
    selectedDepartments,
    scenario,
    note,
    destinationPreference,
  });

  return {
    scenario,
    variant,
    team,
    caseId,
    caseUid,
    awareDate,
    awareTime,
    address,
    patientName,
    age,
    symptom,
    note,
    selectedDepartments,
    payload,
  };
}

async function insertCaseAndRequests(client, reference, caseRecord, index) {
  const createdAt = isoMinutesAgo(5 + index * 6);
  const dispatchAt = caseRecord.scenario.dispatchOrigin
    ? (() => {
        const [month, day] = String(caseRecord.awareDate).split("/");
        return new Date(
          `2026-${String(month ?? "1").padStart(2, "0")}-${String(day ?? "1").padStart(2, "0")}T${caseRecord.awareTime}:00+09:00`,
        ).toISOString();
      })()
    : null;
  await client.query(
    `
      INSERT INTO cases (
        case_id,
        case_uid,
        division,
        aware_date,
        aware_time,
        patient_name,
        age,
        address,
        symptom,
        destination,
        note,
        team_id,
        case_payload,
        dispatch_at,
        created_from,
        created_by_user_id,
        case_status,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10, $11, $12::jsonb, $13, $14, $15, $16, $17, $18
      )
    `,
    [
      caseRecord.caseId,
      caseRecord.caseUid,
      caseRecord.team.division,
      caseRecord.awareDate,
      caseRecord.awareTime,
      caseRecord.patientName,
      caseRecord.age,
      caseRecord.address,
      caseRecord.symptom,
      caseRecord.note,
      caseRecord.team.id,
      JSON.stringify(caseRecord.payload),
      dispatchAt,
      caseRecord.scenario.dispatchOrigin ? "DISPATCH" : null,
      null,
      caseRecord.scenario.requestPattern.some((pattern) => pattern.status === "TRANSPORT_DECIDED") ? "TRANSPORT_DECIDED" : "NEW",
      createdAt,
      createdAt,
    ],
  );

  if (caseRecord.scenario.requestPattern.length === 0) {
    return {
      requestCount: 0,
      targetCount: 0,
      eventCount: 0,
      notificationCount: 0,
      patientCount: 0,
    };
  }

  const hospitals = [];
  const requestId = `${LOAD_REQUEST_PREFIX}${pad(index + 1)}`;
  const sentAt = isoMinutesAgo(10 + index * 3);

  const requestRes = await client.query(
    `
      INSERT INTO hospital_requests (
        request_id,
        case_id,
        case_uid,
        patient_summary,
        from_team_id,
        created_by_user_id,
        sent_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $7, $7)
      RETURNING id
    `,
    [
      requestId,
      caseRecord.caseId,
      caseRecord.caseUid,
      JSON.stringify(caseRecord.payload.summary),
      caseRecord.team.id,
      null,
      sentAt,
    ],
  );
  const requestPk = requestRes.rows[0].id;

  let targetCount = 0;
  let eventCount = 0;
  let notificationCount = 0;
  let patientCount = 0;
  let decidedHospitalName = null;

  for (let offset = 0; offset < caseRecord.scenario.requestPattern.length; offset += 1) {
    const pattern = caseRecord.scenario.requestPattern[offset];
    const hospital = reference.hospitals[(index + offset) % Math.min(reference.hospitals.length, 12)];
    const staleMinutes = pattern.staleMinutes ?? null;
    const openedAt =
      pattern.status === "READ" || pattern.status === "NEGOTIATING" || pattern.status === "ACCEPTABLE" || pattern.status === "NOT_ACCEPTABLE"
        ? isoMinutesAfter(sentAt, staleMinutes != null ? 2 : 4 + offset)
        : null;
    const respondedAt =
      pattern.status === "NEGOTIATING" || pattern.status === "ACCEPTABLE" || pattern.status === "NOT_ACCEPTABLE"
        ? isoMinutesAfter(sentAt, staleMinutes != null ? staleMinutes : 8 + offset)
        : null;
    const decidedAt =
      pattern.status === "TRANSPORT_DECIDED" || pattern.status === "TRANSPORT_DECLINED"
        ? isoMinutesAfter(sentAt, 12 + offset)
        : null;
    const targetUpdatedAt = decidedAt ?? respondedAt ?? openedAt ?? sentAt;
    const selectedDepartments = [
      pick(reference.departments, index + offset),
      pick(reference.departments, index + offset + 3),
    ].filter((value, pos, array) => value && array.indexOf(value) === pos);

    const targetRes = await client.query(
      `
        INSERT INTO hospital_request_targets (
          hospital_request_id,
          hospital_id,
          status,
          selected_departments,
          opened_at,
          responded_at,
          decided_at,
          updated_by_user_id,
          created_at,
          updated_at,
          distance_km
        ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `,
      [
        requestPk,
        hospital.id,
        pattern.status,
        JSON.stringify(selectedDepartments),
        openedAt,
        respondedAt,
        decidedAt,
        null,
        sentAt,
        targetUpdatedAt,
        Number((2.1 + ((index + offset) % 9) * 1.3).toFixed(1)),
      ],
    );
    const targetId = targetRes.rows[0].id;
    targetCount += 1;

    hospitals.push({
      hospitalId: hospital.source_no,
      hospitalName: hospital.name,
      address: hospital.address,
      departments: selectedDepartments,
      distanceKm: Number((2.1 + ((index + offset) % 9) * 1.3).toFixed(1)),
    });

    if (pattern.status !== "UNREAD") {
      await client.query(
        `
          INSERT INTO hospital_request_events (
            target_id,
            event_type,
            from_status,
            to_status,
            acted_by_user_id,
            note,
            reason_code,
            reason_text,
            acted_at
          ) VALUES ($1, 'hospital_response', 'UNREAD', $2, $3, $4, $5, $6, $7)
        `,
        [
          targetId,
          pattern.status,
          null,
          pattern.status === "READ" ? "病院で依頼内容を確認済み" : pattern.reasonText ?? null,
          pattern.reasonCode ?? null,
          pattern.reasonText ?? null,
          respondedAt ?? openedAt ?? targetUpdatedAt,
        ],
      );
      eventCount += 1;
    }
    if (pattern.emsReply) {
      const replyAt = isoMinutesAfter(respondedAt ?? sentAt, 6);
      await client.query(
        `
          INSERT INTO hospital_request_events (
            target_id,
            event_type,
            from_status,
            to_status,
            acted_by_user_id,
            note,
            acted_at
          ) VALUES ($1, 'paramedic_consult_reply', 'NEGOTIATING', 'NEGOTIATING', $2, $3, $4)
        `,
        [
          targetId,
          null,
          "救急隊返信: 発症時刻は10分前、抗凝固薬内服あり。頭部CT可否を確認願います。",
          replyAt,
        ],
      );
      eventCount += 1;
      await client.query(
        `
          INSERT INTO notifications (
            audience_role,
            team_id,
            hospital_id,
            target_user_id,
            kind,
            case_id,
            case_uid,
            target_id,
            title,
            body,
            menu_key,
            tab_key,
            severity,
            dedupe_key,
            created_at
          ) VALUES ($1, NULL, $2, NULL, 'consult_comment_from_ems', $3, $4, $5, $6, $7, 'hospitals-consults', NULL, 'info', NULL, $8)
        `,
        [
          "HOSPITAL",
          hospital.id,
          caseRecord.caseId,
          caseRecord.caseUid,
          targetId,
          "救急隊から相談返信",
          `事案 ${caseRecord.caseId} について救急隊から補足情報が返信されました。`,
          replyAt,
        ],
      );
      notificationCount += 1;
    }

    if (["READ", "ACCEPTABLE", "NOT_ACCEPTABLE"].includes(pattern.status)) {
      await client.query(
        `
          INSERT INTO notifications (
            audience_role,
            team_id,
            hospital_id,
            target_user_id,
            kind,
            case_id,
            case_uid,
            target_id,
            title,
            body,
            menu_key,
            tab_key,
            severity,
            dedupe_key,
            created_at
          ) VALUES ($1, $2, NULL, NULL, 'hospital_status_changed', $3, $4, $5, $6, $7, 'cases-list', 'selection-history', $8, $9, $10)
        `,
        [
          "EMS",
          caseRecord.team.id,
          caseRecord.caseId,
          caseRecord.caseUid,
          targetId,
          "病院応答あり",
          `事案 ${caseRecord.caseId} の病院応答ステータスが ${pattern.status} に更新されました。`,
          pattern.status === "NOT_ACCEPTABLE" ? "warning" : "info",
          `hospital-status:${targetId}:${pattern.status}`,
          respondedAt ?? openedAt ?? targetUpdatedAt,
        ],
      );
      notificationCount += 1;
    }

    if (pattern.status === "TRANSPORT_DECIDED" || pattern.status === "TRANSPORT_DECLINED") {
      const actedAt = decidedAt ?? targetUpdatedAt;
      await client.query(
        `
          INSERT INTO hospital_request_events (
            target_id,
            event_type,
            from_status,
            to_status,
            acted_by_user_id,
            note,
            reason_code,
            reason_text,
            acted_at
          ) VALUES ($1, 'paramedic_decision', 'ACCEPTABLE', $2, $3, $4, $5, $6, $7)
        `,
        [
          targetId,
          pattern.status,
          null,
          pattern.status === "TRANSPORT_DECIDED" ? "搬送先を確定" : "他院決定のため自動辞退",
          pattern.reasonCode ?? null,
          pattern.reasonText ?? null,
          actedAt,
        ],
      );
      eventCount += 1;
      await client.query(
        `
          INSERT INTO notifications (
            audience_role,
            team_id,
            hospital_id,
            target_user_id,
            kind,
            case_id,
            case_uid,
            target_id,
            title,
            body,
            menu_key,
            tab_key,
            severity,
            dedupe_key,
            created_at
          ) VALUES ($1, NULL, $2, NULL, $3, $4, $5, $6, $7, $8, $9, NULL, 'info', $10, $11)
        `,
        [
          "HOSPITAL",
          hospital.id,
          pattern.status === "TRANSPORT_DECIDED" ? "transport_decided" : "transport_declined",
          caseRecord.caseId,
          caseRecord.caseUid,
          targetId,
          pattern.status === "TRANSPORT_DECIDED" ? "搬送決定" : "搬送辞退",
          pattern.status === "TRANSPORT_DECIDED"
            ? `事案 ${caseRecord.caseId} の搬送先が決定しました。`
            : `事案 ${caseRecord.caseId} は他院搬送のため辞退扱いになりました。`,
          pattern.status === "TRANSPORT_DECIDED" ? "hospitals-patients" : "hospitals-declined",
          `decision:${targetId}:${pattern.status}`,
          actedAt,
        ],
      );
      notificationCount += 1;
    }

    if (pattern.status === "TRANSPORT_DECIDED") {
      await client.query(
        `
          INSERT INTO hospital_patients (
            target_id,
            hospital_id,
            case_id,
            case_uid,
            request_id,
            status,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, 'TRANSPORT_DECIDED', $6, $6)
        `,
        [targetId, hospital.id, caseRecord.caseId, caseRecord.caseUid, requestId, decidedAt ?? targetUpdatedAt],
      );
      patientCount += 1;
      decidedHospitalName = hospital.name;
    }
  }

  caseRecord.payload.sendHistory = [
    {
      requestId,
      caseId: caseRecord.caseId,
      sentAt,
      status:
        caseRecord.scenario.requestPattern.find((item) => item.status === "TRANSPORT_DECIDED")?.status
        ?? caseRecord.scenario.requestPattern[0].status,
      patientSummary: caseRecord.payload.summary,
      hospitalCount: hospitals.length,
      hospitalNames: hospitals.map((hospital) => hospital.hospitalName),
      hospitals,
      searchMode: caseRecord.payload.transport.searchMode,
      selectedDepartments: caseRecord.selectedDepartments,
    },
  ];

  await client.query(
    `
      UPDATE cases
      SET destination = $2,
          case_payload = $3::jsonb,
          updated_at = $4
      WHERE case_uid = $1
    `,
    [caseRecord.caseUid, decidedHospitalName, JSON.stringify(caseRecord.payload), isoMinutesAfter(sentAt, 20)],
  );

  return {
    requestCount: 1,
    targetCount,
    eventCount,
    notificationCount,
    patientCount,
  };
}

async function seedCaseLoadTestData(client, caseCount, dryRun, options = {}) {
  if (caseCount % DEFAULT_CASE_COUNT !== 0) {
    throw new Error(`--count must be a multiple of ${DEFAULT_CASE_COUNT} so scenario distribution stays balanced.`);
  }

  const reference = await loadReferenceData(client, options);
  const seedChunkSize = Math.min(Math.max(1, Number(options.seedChunkSize ?? DEFAULT_SEED_CHUNK_SIZE)), caseCount);
  const summary = {
    casesInserted: 0,
    requestsInserted: 0,
    targetsInserted: 0,
    eventsInserted: 0,
    notificationsInserted: 0,
    patientsInserted: 0,
    scenarios: {},
  };

  if (dryRun) {
    return {
      mode: "dry-run",
      teamsUsed: reference.teams.slice(0, 8).map((row) => ({ id: row.id, teamCode: row.team_code, teamName: row.team_name })),
      hospitalsUsed: reference.hospitals.slice(0, 12).map((row) => ({ id: row.id, sourceNo: row.source_no, name: row.name })),
      caseCount,
      seedChunkSize,
      preferredHospitalSourceNos: options.preferredHospitalSourceNos ?? [],
      scenarioKeys: SCENARIO_TEMPLATES.map((scenario) => scenario.key),
    };
  }

  let inTransaction = false;
  try {
    for (let index = 0; index < caseCount; index += 1) {
      if (!inTransaction) {
        await client.query("BEGIN");
        inTransaction = true;
      }

      const caseRecord = buildCaseRecord(reference, index);
      const result = await insertCaseAndRequests(client, reference, caseRecord, index);
      summary.casesInserted += 1;
      summary.requestsInserted += result.requestCount;
      summary.targetsInserted += result.targetCount;
      summary.eventsInserted += result.eventCount;
      summary.notificationsInserted += result.notificationCount;
      summary.patientsInserted += result.patientCount;
      summary.scenarios[caseRecord.scenario.key] = (summary.scenarios[caseRecord.scenario.key] ?? 0) + 1;

      const shouldCommitChunk = (index + 1) % seedChunkSize === 0 || index + 1 === caseCount;
      if (shouldCommitChunk) {
        await client.query("COMMIT");
        inTransaction = false;
      }
    }
  } catch (error) {
    if (inTransaction) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    throw error;
  }

  const counts = await getCaseDataCounts(client);
  return {
    mode: "apply",
    caseCount,
    seedChunkSize,
    ...summary,
    totals: counts,
  };
}

async function verifyCaseLoadTestData(client, expectedCases) {
  const [casesRes, targetsRes, notificationsRes, patientsRes, selectionAlertsRes, consultAlertsRes] = await Promise.all([
    client.query(
      `
        SELECT
          COUNT(*)::int AS total_cases,
          COUNT(*) FILTER (WHERE case_payload->'loadTest'->>'batch' = $1)::int AS batch_cases
        FROM cases
        WHERE case_id LIKE $2
      `,
      [LOAD_BATCH, `${LOAD_CASE_ID_PREFIX}%`],
    ),
    client.query(
      `
        SELECT status, COUNT(*)::int AS count
        FROM hospital_request_targets t
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        WHERE r.case_id LIKE $1
        GROUP BY status
        ORDER BY status
      `,
      [`${LOAD_CASE_ID_PREFIX}%`],
    ),
    client.query(
      `
        SELECT kind, COUNT(*)::int AS count
        FROM notifications
        WHERE case_id LIKE $1
        GROUP BY kind
        ORDER BY kind
      `,
      [`${LOAD_CASE_ID_PREFIX}%`],
    ),
    client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM hospital_patients
        WHERE case_id LIKE $1
      `,
      [`${LOAD_CASE_ID_PREFIX}%`],
    ),
    client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT 1
          FROM hospital_requests r
          JOIN hospital_request_targets t ON t.hospital_request_id = r.id
          WHERE r.case_id LIKE $1
          GROUP BY r.case_id, r.case_uid, r.from_team_id
          HAVING COUNT(*) > 0
            AND BOOL_OR(t.status = 'TRANSPORT_DECIDED') = FALSE
            AND FLOOR(EXTRACT(EPOCH FROM (NOW() - GREATEST(MAX(r.sent_at), COALESCE(MAX(t.responded_at), MAX(r.sent_at))))) / 60) >= 15
        ) stalled
      `,
      [`${LOAD_CASE_ID_PREFIX}%`],
    ),
    client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT t.id
          FROM hospital_request_targets t
          JOIN hospital_requests r ON r.id = t.hospital_request_id
          JOIN LATERAL (
            SELECT MAX(e.acted_at) AS latest_consult_at
            FROM hospital_request_events e
            WHERE e.target_id = t.id
              AND e.to_status = 'NEGOTIATING'
          ) consult_event ON consult_event.latest_consult_at IS NOT NULL
          WHERE r.case_id LIKE $1
            AND t.status = 'NEGOTIATING'
            AND FLOOR(EXTRACT(EPOCH FROM (NOW() - consult_event.latest_consult_at)) / 60) >= 10
        ) stalled
      `,
      [`${LOAD_CASE_ID_PREFIX}%`],
    ),
  ]);

  const totalCases = casesRes.rows[0].total_cases;
  const batchCases = casesRes.rows[0].batch_cases;
  if (totalCases !== expectedCases || batchCases !== expectedCases) {
    throw new Error(`Expected ${expectedCases} load-test cases, found total=${totalCases}, batch=${batchCases}.`);
  }

  const targetStatuses = Object.fromEntries(targetsRes.rows.map((row) => [row.status, row.count]));
  const notificationKinds = Object.fromEntries(notificationsRes.rows.map((row) => [row.kind, row.count]));
  const hospitalPatients = patientsRes.rows[0].count;
  const selectionStalled = selectionAlertsRes.rows[0].count;
  const consultStalled = consultAlertsRes.rows[0].count;

  if ((targetStatuses.TRANSPORT_DECIDED ?? 0) < 10) throw new Error("Expected at least 10 TRANSPORT_DECIDED targets.");
  if ((targetStatuses.NEGOTIATING ?? 0) < 20) throw new Error("Expected at least 20 NEGOTIATING targets.");
  if ((notificationKinds.hospital_status_changed ?? 0) < 20) throw new Error("Expected hospital_status_changed notifications.");
  if ((notificationKinds.transport_decided ?? 0) < 10) throw new Error("Expected transport_decided notifications.");
  if ((notificationKinds.transport_declined ?? 0) < 10) throw new Error("Expected transport_declined notifications.");
  if ((notificationKinds.consult_comment_from_ems ?? 0) < 10) throw new Error("Expected consult_comment_from_ems notifications.");
  if (hospitalPatients < 10) throw new Error("Expected at least 10 hospital_patients rows.");
  if (selectionStalled < 10) throw new Error("Expected at least 10 selection-stalled cases.");
  if (consultStalled < 10) throw new Error("Expected at least 10 consult-stalled targets.");

  return {
    totalCases,
    batchCases,
    targetStatuses,
    notificationKinds,
    hospitalPatients,
    selectionStalled,
    consultStalled,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = new Client({
    application_name: "case-load-test-data",
    connectionString: readDatabaseUrl(),
    connectionTimeoutMillis: 15_000,
    query_timeout: 310_000,
    statement_timeout: 300_000,
  });
  await client.connect();
  try {
    await client.query("SET lock_timeout = '10s'");
    await client.query("SET idle_in_transaction_session_timeout = '30s'");
    await client.query("SET statement_timeout = '5min'");

    let result;
    if (args.command === "summary") {
      result = await getCaseDataCounts(client);
    } else if (args.command === "reset") {
      result = await resetCaseOperationalData(client, args.dryRun);
    } else if (args.command === "seed") {
      result = await seedCaseLoadTestData(client, args.caseCount, args.dryRun, {
        seedChunkSize: args.seedChunkSize,
        preferredHospitalSourceNos: args.preferredHospitalSourceNos,
      });
    } else if (args.command === "verify") {
      result = await verifyCaseLoadTestData(client, args.expected);
    } else {
      throw new Error(`Unknown command: ${args.command}`);
    }
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
