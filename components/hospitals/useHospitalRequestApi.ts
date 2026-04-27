"use client";

import { useRef, useState } from "react";

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
  isTriageRequest?: boolean;
  isDispatchSelectionRequest?: boolean;
  selectedDepartments: string[];
  fromTeamCode: string | null;
  fromTeamName: string | null;
  fromTeamPhone?: string | null;
  consultComment?: string | null;
  emsReplyComment?: string | null;
  acceptedCapacity?: number | null;
};

export type HospitalConsultMessage = {
  id: number;
  actor: "HP" | "A";
  actedAt: string;
  note: string;
};

export type HospitalDecisionReasonPayload = {
  reasonCode?: string;
  reasonText?: string;
};

type DetailErrorResponse = { message?: string };
type MessagesResponse = { messages?: HospitalConsultMessage[]; message?: string };
type StatusResponse = { message?: string };

const DETAIL_FETCH_ERROR = "詳細取得に失敗しました。";
const CONSULT_FETCH_ERROR = "相談履歴の取得に失敗しました。";
const STATUS_UPDATE_ERROR = "ステータス更新に失敗しました。";

export function useHospitalRequestApi() {
  const [detail, setDetail] = useState<HospitalRequestDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [messages, setMessages] = useState<HospitalConsultMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const detailCacheRef = useRef<Record<number, HospitalRequestDetailResponse>>({});
  const messagesCacheRef = useRef<Record<number, HospitalConsultMessage[]>>({});

  const fetchDetail = async (targetId: number, options?: { background?: boolean }) => {
    const cachedDetail = detailCacheRef.current[targetId];
    if (cachedDetail) {
      setDetail(cachedDetail);
      setDetailError("");
      return cachedDetail;
    }

    if (!options?.background) {
      setDetailLoading(true);
      setDetailError("");
    }
    try {
      const res = await fetch(`/api/hospitals/requests/${targetId}`);
      const data = (await res.json()) as HospitalRequestDetailResponse | DetailErrorResponse;
      if (!res.ok) {
        throw new Error("message" in data ? data.message ?? DETAIL_FETCH_ERROR : DETAIL_FETCH_ERROR);
      }
      const nextDetail = data as HospitalRequestDetailResponse;
      detailCacheRef.current[targetId] = nextDetail;
      setDetail(nextDetail);
      return nextDetail;
    } catch (error) {
      if (!options?.background) {
        setDetailError(error instanceof Error ? error.message : DETAIL_FETCH_ERROR);
        setDetail(null);
      }
      return null;
    } finally {
      if (!options?.background) {
        setDetailLoading(false);
      }
    }
  };

  const resetDetail = () => {
    setDetail(null);
    setDetailLoading(false);
    setDetailError("");
  };

  const fetchMessages = async (targetId: number, options?: { background?: boolean }) => {
    const cachedMessages = messagesCacheRef.current[targetId];
    if (cachedMessages) {
      setMessages(cachedMessages);
      setMessagesError("");
      return cachedMessages;
    }

    if (!options?.background) {
      setMessagesLoading(true);
      setMessagesError("");
    }
    try {
      const res = await fetch(`/api/hospitals/requests/${targetId}/consult`);
      const data = (await res.json()) as MessagesResponse;
      if (!res.ok) throw new Error(data.message ?? CONSULT_FETCH_ERROR);
      const nextMessages = Array.isArray(data.messages) ? data.messages : [];
      messagesCacheRef.current[targetId] = nextMessages;
      setMessages(nextMessages);
      return nextMessages;
    } catch (error) {
      if (!options?.background) {
        setMessagesError(error instanceof Error ? error.message : CONSULT_FETCH_ERROR);
        setMessages([]);
      }
      return [];
    } finally {
      if (!options?.background) {
        setMessagesLoading(false);
      }
    }
  };

  const resetMessages = () => {
    setMessages([]);
    setMessagesLoading(false);
    setMessagesError("");
  };

  const updateStatus = async (
    targetId: number,
    status: "NEGOTIATING" | "ACCEPTABLE" | "NOT_ACCEPTABLE",
    note?: string,
    reason?: HospitalDecisionReasonPayload,
    options?: { acceptedCapacity?: number | string | null },
  ) => {
    const res = await fetch(`/api/hospitals/requests/${targetId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        note: note ?? undefined,
        reasonCode: reason?.reasonCode,
        reasonText: reason?.reasonText,
        acceptedCapacity: options?.acceptedCapacity ?? undefined,
      }),
    });
    const data = (await res.json().catch(() => null)) as StatusResponse | null;
    if (!res.ok) {
      return { ok: false as const, message: data?.message ?? STATUS_UPDATE_ERROR };
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
