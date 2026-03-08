"use client";

import { useState } from "react";

export type HospitalRequestDetailResponse = {
  targetId: number;
  requestId: string;
  caseId: string;
  sentAt: string;
  awareDate?: string;
  awareTime?: string;
  dispatchAddress?: string;
  status: string;
  statusLabel: string;
  openedAt: string | null;
  patientSummary: Record<string, unknown> | null;
  selectedDepartments: string[];
  fromTeamCode: string | null;
  fromTeamName: string | null;
  fromTeamPhone?: string | null;
  consultComment?: string | null;
  emsReplyComment?: string | null;
};

export type HospitalConsultMessage = {
  id: number;
  actor: "HP" | "A";
  actedAt: string;
  note: string;
};

type DetailErrorResponse = { message?: string };
type MessagesResponse = { messages?: HospitalConsultMessage[]; message?: string };
type StatusResponse = { message?: string };

export function useHospitalRequestApi() {
  const [detail, setDetail] = useState<HospitalRequestDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [messages, setMessages] = useState<HospitalConsultMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");

  const fetchDetail = async (targetId: number) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await fetch(`/api/hospitals/requests/${targetId}`);
      const data = (await res.json()) as HospitalRequestDetailResponse | DetailErrorResponse;
      if (!res.ok) {
        throw new Error("message" in data ? data.message ?? "詳細取得に失敗しました。" : "詳細取得に失敗しました。");
      }
      const nextDetail = data as HospitalRequestDetailResponse;
      setDetail(nextDetail);
      return nextDetail;
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "詳細取得に失敗しました。");
      setDetail(null);
      return null;
    } finally {
      setDetailLoading(false);
    }
  };

  const resetDetail = () => {
    setDetail(null);
    setDetailLoading(false);
    setDetailError("");
  };

  const fetchMessages = async (targetId: number) => {
    setMessagesLoading(true);
    setMessagesError("");
    try {
      const res = await fetch(`/api/hospitals/requests/${targetId}/consult`);
      const data = (await res.json()) as MessagesResponse;
      if (!res.ok) throw new Error(data.message ?? "相談履歴取得に失敗しました。");
      const nextMessages = Array.isArray(data.messages) ? data.messages : [];
      setMessages(nextMessages);
      return nextMessages;
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : "相談履歴取得に失敗しました。");
      setMessages([]);
      return [];
    } finally {
      setMessagesLoading(false);
    }
  };

  const resetMessages = () => {
    setMessages([]);
    setMessagesLoading(false);
    setMessagesError("");
  };

  const updateStatus = async (targetId: number, status: "NEGOTIATING" | "ACCEPTABLE" | "NOT_ACCEPTABLE", note?: string) => {
    const res = await fetch(`/api/hospitals/requests/${targetId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note: note ?? undefined }),
    });
    const data = (await res.json().catch(() => null)) as StatusResponse | null;
    if (!res.ok) {
      return { ok: false as const, message: data?.message ?? "更新に失敗しました。" };
    }
    return { ok: true as const };
  };

  return {
    detail,
    detailLoading,
    detailError,
    fetchDetail,
    resetDetail,
    messages,
    messagesLoading,
    messagesError,
    fetchMessages,
    resetMessages,
    updateStatus,
  };
}
