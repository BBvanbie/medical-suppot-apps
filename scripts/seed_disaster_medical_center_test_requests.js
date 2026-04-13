/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require("pg");
const { readDatabaseUrl } = require("./db_url");

const CASE_ID_PREFIX = "DMC-TEST-20260413-";
const CASE_UID_PREFIX = "dev-dmc-20260413-";
const REQUEST_ID_PREFIX = "DMC-REQ-20260413-";
const MODE = "LIVE";
const TARGET_CASE_COUNT = 10;

const PATIENTS = [
  { name: "山田 太郎", age: "72", gender: "male", symptom: "胸痛", departments: ["循環器内科", "救急科"] },
  { name: "佐藤 花子", age: "68", gender: "female", symptom: "意識障害", departments: ["脳神経外科", "救急科"] },
  { name: "鈴木 一郎", age: "81", gender: "male", symptom: "呼吸苦", departments: ["呼吸器内科", "救急科"] },
  { name: "高橋 美咲", age: "55", gender: "female", symptom: "頭痛・嘔吐", departments: ["脳神経外科"] },
  { name: "田中 健", age: "63", gender: "male", symptom: "腹痛", departments: ["消化器内科", "外科"] },
  { name: "伊藤 由美", age: "77", gender: "female", symptom: "転倒外傷", departments: ["整形外科", "救急科"] },
  { name: "渡辺 直樹", age: "49", gender: "male", symptom: "けいれん後", departments: ["神経内科", "救急科"] },
  { name: "中村 彩", age: "34", gender: "female", symptom: "発熱・脱水疑い", departments: ["内科", "救急科"] },
  { name: "小林 真一", age: "86", gender: "male", symptom: "腰背部痛", departments: ["循環器内科", "整形外科"] },
  { name: "加藤 優奈", age: "29", gender: "female", symptom: "交通外傷", departments: ["外科", "整形外科"] },
];

const CONSULT_INDEXES = new Set([1, 3, 6, 8]);
const EMS_REPLY_INDEXES = new Set([1, 6]);

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function makeCaseUid(index) {
  return `${CASE_UID_PREFIX}${String(index + 1).padStart(3, "0")}`;
}

function makeCaseId(index) {
  return `${CASE_ID_PREFIX}${String(index + 1).padStart(3, "0")}`;
}

function makeRequestId(index) {
  return `${REQUEST_ID_PREFIX}${String(index + 1).padStart(3, "0")}`;
}

function buildPatientSummary(patient, index, team) {
  const measuredAt = `${String(9 + Math.floor(index / 3)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`;
  return {
    caseId: makeCaseId(index),
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    address: `東京都立川市緑町 ${index + 1}-${index + 3}`,
    phone: `090-0000-${String(1200 + index).padStart(4, "0")}`,
    incidentType: index === 9 ? "交通事故" : "急病",
    chiefComplaint: patient.symptom,
    dispatchSummary: `${patient.symptom}で災害医療センターへ受入照会。バイタルと既往を確認済み。`,
    teamName: team.team_name,
    teamCode: team.team_code,
    allergy: index % 3 === 0 ? "ペニシリン" : "なし",
    dnar: "未確認",
    weight: String(52 + index * 3),
    vitals: [
      {
        measuredAt,
        consciousnessType: "JCS",
        consciousnessValue: index % 4 === 0 ? "10" : "0",
        respiratoryRate: String(18 + (index % 5)),
        pulseRate: String(78 + index * 3),
        spo2: String(94 + (index % 5)),
        pupilRight: "3.0",
        pupilLeft: "3.0",
        lightReflexRight: "あり",
        lightReflexLeft: "あり",
        temperature: String((36.4 + (index % 4) * 0.3).toFixed(1)),
        ecg: index === 0 || index === 8 ? "ST変化疑い" : "明らかな異常なし",
      },
    ],
    pastHistories: [
      { disease: index % 2 === 0 ? "高血圧" : "糖尿病", clinic: "かかりつけ確認中" },
      { disease: index % 3 === 0 ? "心房細動" : "", clinic: "" },
    ],
    relatedPeople: [
      { name: "家族確認中", relation: "家族", phone: "090-0000-0000" },
    ],
  };
}

async function findOne(client, query, values, label) {
  const result = await client.query(query, values);
  if (!result.rows[0]) {
    throw new Error(`${label} was not found.`);
  }
  return result.rows[0];
}

async function deleteExistingSeed(client) {
  await client.query(
    `
      DELETE FROM notifications
      WHERE case_uid LIKE $1
         OR case_id LIKE $2
         OR dedupe_key LIKE $3
    `,
    [`${CASE_UID_PREFIX}%`, `${CASE_ID_PREFIX}%`, `dmc-test:%`],
  );
  await client.query(
    `
      DELETE FROM hospital_requests
      WHERE case_uid LIKE $1
         OR request_id LIKE $2
    `,
    [`${CASE_UID_PREFIX}%`, `${REQUEST_ID_PREFIX}%`],
  );
  await client.query(
    `
      DELETE FROM cases
      WHERE case_uid LIKE $1
         OR case_id LIKE $2
    `,
    [`${CASE_UID_PREFIX}%`, `${CASE_ID_PREFIX}%`],
  );
}

async function seed() {
  const databaseUrl = readDatabaseUrl();
  const parsedUrl = new URL(databaseUrl);
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();
  try {
    await client.query("BEGIN");

    const team = await findOne(
      client,
      `
        SELECT id, team_code, team_name, phone
        FROM emergency_teams
        WHERE team_name IN ('本部機動第1', '本部機動第一')
           OR team_code = 'EMS-015'
        ORDER BY CASE WHEN team_name = '本部機動第1' THEN 0 ELSE 1 END
        LIMIT 1
      `,
      [],
      "本部機動第1",
    );
    const emsUser = await findOne(
      client,
      `
        SELECT id
        FROM users
        WHERE role = 'EMS'
          AND team_id = $1
        ORDER BY id
        LIMIT 1
      `,
      [team.id],
      "本部機動第1のEMSユーザー",
    );
    const hospital = await findOne(
      client,
      `
        SELECT id, source_no, name
        FROM hospitals
        WHERE source_no = 263
           OR name LIKE '%災害医療センター%'
        ORDER BY CASE WHEN source_no = 263 THEN 0 ELSE 1 END
        LIMIT 1
      `,
      [],
      "災害医療センター",
    );
    const hospitalUser = await findOne(
      client,
      `
        SELECT id
        FROM users
        WHERE role = 'HOSPITAL'
          AND hospital_id = $1
        ORDER BY id
        LIMIT 1
      `,
      [hospital.id],
      "災害医療センターの病院ユーザー",
    );

    await deleteExistingSeed(client);

    const insertedTargets = [];
    for (let index = 0; index < TARGET_CASE_COUNT; index += 1) {
      const patient = PATIENTS[index];
      const caseId = makeCaseId(index);
      const caseUid = makeCaseUid(index);
      const requestId = makeRequestId(index);
      const sentAt = minutesAgo(55 - index * 4);
      const openedAt = CONSULT_INDEXES.has(index) || index % 3 === 0 ? minutesAgo(52 - index * 4) : null;
      const respondedAt = CONSULT_INDEXES.has(index) ? minutesAgo(47 - index * 4) : null;
      const status = CONSULT_INDEXES.has(index) ? "NEGOTIATING" : openedAt ? "READ" : "UNREAD";
      const patientSummary = buildPatientSummary(patient, index, team);

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
            mode,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, $10, $11, $12::jsonb, $13, $14, $14)
        `,
        [
          caseId,
          caseUid,
          "1部",
          "4/13",
          `${String(9 + Math.floor(index / 3)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`,
          patient.name,
          patient.age,
          patientSummary.address,
          patient.symptom,
          "災害医療センター向けテスト事案",
          team.id,
          JSON.stringify(patientSummary),
          MODE,
          sentAt,
        ],
      );

      const requestResult = await client.query(
        `
          INSERT INTO hospital_requests (
            request_id,
            case_id,
            case_uid,
            mode,
            patient_summary,
            from_team_id,
            created_by_user_id,
            sent_at,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $8, $8)
          RETURNING id
        `,
        [requestId, caseId, caseUid, MODE, JSON.stringify(patientSummary), team.id, emsUser.id, sentAt],
      );

      const targetResult = await client.query(
        `
          INSERT INTO hospital_request_targets (
            hospital_request_id,
            hospital_id,
            status,
            selected_departments,
            opened_at,
            responded_at,
            updated_by_user_id,
            created_at,
            updated_at,
            distance_km
          ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `,
        [
          requestResult.rows[0].id,
          hospital.id,
          status,
          JSON.stringify(patient.departments),
          openedAt,
          respondedAt,
          CONSULT_INDEXES.has(index) ? hospitalUser.id : null,
          sentAt,
          respondedAt ?? openedAt ?? sentAt,
          Number((3.2 + index * 0.4).toFixed(1)),
        ],
      );
      const targetId = targetResult.rows[0].id;
      insertedTargets.push({ caseId, status, targetId });

      await client.query(
        `
          INSERT INTO notifications (
            audience_role,
            mode,
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
          ) VALUES ('HOSPITAL', $1, NULL, $2, NULL, 'hospital_request_received', $3, $4, $5, $6, $7, 'hospitals-requests', NULL, 'info', $8, $9)
        `,
        [
          MODE,
          hospital.id,
          caseId,
          caseUid,
          targetId,
          "受入要請あり",
          `事案 ${caseId} が${team.team_name}から送信されました。`,
          `dmc-test:hospital-request:${targetId}`,
          sentAt,
        ],
      );

      if (openedAt && status === "READ") {
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
            ) VALUES ($1, 'hospital_response', 'UNREAD', 'READ', $2, '病院で依頼内容を確認済み', $3)
          `,
          [targetId, hospitalUser.id, openedAt],
        );
      }

      if (CONSULT_INDEXES.has(index)) {
        const consultNote =
          index === 1
            ? "意識障害の経過、抗凝固薬内服、最終健常時刻を追加で確認してください。"
            : "画像検査と専門診療の可否判断のため、追加情報をお願いします。";
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
            ) VALUES ($1, 'hospital_response', 'UNREAD', 'NEGOTIATING', $2, $3, $4)
          `,
          [targetId, hospitalUser.id, consultNote, respondedAt],
        );
        await client.query(
          `
            INSERT INTO notifications (
              audience_role,
              mode,
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
            ) VALUES ('EMS', $1, $2, NULL, NULL, 'consult_status_changed', $3, $4, $5, '相談対応あり', $6, 'cases-list', 'consults', 'info', NULL, $7)
          `,
          [
            MODE,
            team.id,
            caseId,
            caseUid,
            targetId,
            `事案 ${caseId} について${hospital.name}から追加確認があります。`,
            respondedAt,
          ],
        );
      }

      if (EMS_REPLY_INDEXES.has(index)) {
        const replyAt = minutesAgo(43 - index * 4);
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
            emsUser.id,
            "救急隊返信: 現場で追加確認しました。直近バイタルは安定、搬送中に再測定します。",
            replyAt,
          ],
        );
        await client.query(
          `
            INSERT INTO notifications (
              audience_role,
              mode,
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
            ) VALUES ('HOSPITAL', $1, NULL, $2, NULL, 'consult_comment_from_ems', $3, $4, $5, '救急隊から相談返信', $6, 'hospitals-consults', NULL, 'info', NULL, $7)
          `,
          [
            MODE,
            hospital.id,
            caseId,
            caseUid,
            targetId,
            `事案 ${caseId} について救急隊から補足情報が返信されました。`,
            replyAt,
          ],
        );
      }
    }

    const summary = await client.query(
      `
        SELECT
          COUNT(DISTINCT t.id)::int AS total,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'NEGOTIATING')::int AS negotiating,
          COUNT(DISTINCT e.id) FILTER (WHERE e.event_type = 'paramedic_consult_reply')::int AS ems_replies
        FROM hospital_request_targets t
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        LEFT JOIN hospital_request_events e ON e.target_id = t.id
        WHERE r.case_uid LIKE $1
      `,
      [`${CASE_UID_PREFIX}%`],
    );

    await client.query("COMMIT");
    return {
      databaseHost: parsedUrl.host,
      team: team.team_name,
      hospital: hospital.name,
      total: summary.rows[0].total,
      negotiating: summary.rows[0].negotiating,
      emsReplies: summary.rows[0].ems_replies,
      targets: insertedTargets,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

seed()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
