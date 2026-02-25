import { NextResponse } from "next/server";

import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";

type SendHistoryItem = {
  requestId: string;
  caseId: string;
  sentAt: string;
  status?: "未読" | "既読" | "受入可能" | "搬送先決定" | "キャンセル済";
  hospitalCount: number;
  hospitalNames: string[];
  hospitals?: Array<{
    hospitalId: number;
    hospitalName: string;
    address?: string;
    phone?: string;
    departments?: string[];
    distanceKm?: number | null;
  }>;
  searchMode?: "or" | "and";
  selectedDepartments?: string[];
};

type PostBody = {
  caseId: string;
  item: SendHistoryItem;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readSendHistory(value: unknown): SendHistoryItem[] {
  const payload = asObject(value);
  const history = payload.sendHistory;
  return Array.isArray(history) ? (history as SendHistoryItem[]) : [];
}

export async function GET(req: Request) {
  try {
    await ensureCasesColumns();
    const { searchParams } = new URL(req.url);
    const caseId = (searchParams.get("caseId") ?? "").trim();
    if (!caseId) {
      return NextResponse.json({ message: "caseId is required." }, { status: 400 });
    }

    const res = await db.query<{ case_payload: unknown }>(
      `
      SELECT case_payload
      FROM cases
      WHERE case_id = $1
      LIMIT 1
      `,
      [caseId],
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ rows: [] as SendHistoryItem[] });
    }

    const rows = readSendHistory(res.rows[0].case_payload).sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    );
    return NextResponse.json({ rows });
  } catch (e) {
    console.error("GET /api/cases/send-history failed", e);
    return NextResponse.json({ message: "送信履歴の取得に失敗しました。" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureCasesColumns();
    const body = (await req.json()) as PostBody;
    const caseId = (body.caseId ?? "").trim();
    const item = body.item;

    if (!caseId || !item?.requestId || !item?.sentAt) {
      return NextResponse.json({ message: "caseId and item are required." }, { status: 400 });
    }

    const target = await db.query<{ case_payload: unknown }>(
      `
      SELECT case_payload
      FROM cases
      WHERE case_id = $1
      LIMIT 1
      `,
      [caseId],
    );

    if (target.rows.length === 0) {
      return NextResponse.json({ message: "対象事案が見つかりません。" }, { status: 404 });
    }

    const prevPayload = asObject(target.rows[0].case_payload);
    const prevHistory = readSendHistory(prevPayload);
    const normalizedItem: SendHistoryItem = {
      ...item,
      status: item.status ?? "未読",
    };
    const nextHistory = [normalizedItem, ...prevHistory.filter((v) => v.requestId !== item.requestId)].slice(0, 300);
    const nextPayload = { ...prevPayload, sendHistory: nextHistory };

    await db.query(
      `
      UPDATE cases
      SET case_payload = $2::jsonb, updated_at = NOW()
      WHERE case_id = $1
      `,
      [caseId, JSON.stringify(nextPayload)],
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/cases/send-history failed", e);
    return NextResponse.json({ message: "送信履歴の保存に失敗しました。" }, { status: 500 });
  }
}
