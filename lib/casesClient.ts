type ApiErrorPayload = {
  message?: string;
};

export type TransportDecisionPayload = {
  reasonCode?: string;
  reasonText?: string;
};

async function parseJson<T>(res: Response): Promise<T | null> {
  return (await res.json().catch(() => null)) as T | null;
}

export async function createCaseRecord<TPayload, TResponse>(payload: TPayload): Promise<TResponse> {
  const res = await fetch("/api/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<TResponse & ApiErrorPayload>(res);
  if (!res.ok) {
    throw new Error(data?.message ?? "保存に失敗しました。");
  }
  return data as TResponse;
}

export async function fetchCaseConsultDetail<TStatus, TMessage>(
  targetId: number,
): Promise<{ status?: TStatus; messages: TMessage[] }> {
  const res = await fetch(`/api/cases/consults/${targetId}`);
  const data = await parseJson<{
    status?: TStatus;
    messages?: TMessage[];
    message?: string;
  }>(res);
  if (!res.ok) {
    throw new Error(data?.message ?? "相談履歴の取得に失敗しました。");
  }
  return {
    status: data?.status,
    messages: Array.isArray(data?.messages) ? data.messages : [],
  };
}

export async function sendCaseConsultReply(targetId: number, note: string): Promise<void> {
  const res = await fetch(`/api/cases/consults/${targetId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  const data = await parseJson<ApiErrorPayload>(res);
  if (!res.ok) {
    throw new Error(data?.message ?? "相談コメント送信に失敗しました。");
  }
}

export async function updateTransportDecision(
  targetId: number,
  payload:
    | ({ caseId: string; action: "DECIDE"; status: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED" } & TransportDecisionPayload)
    | ({ nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED" } & TransportDecisionPayload),
): Promise<{ statusLabel?: string }> {
  const useLegacyEndpoint = "caseId" in payload;
  const res = await fetch(
    useLegacyEndpoint ? "/api/cases/send-history" : `/api/cases/send-history/${targetId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(useLegacyEndpoint ? { ...payload, targetId } : payload),
    },
  );
  const data = await parseJson<{ statusLabel?: string; message?: string }>(res);
  if (!res.ok) {
    throw new Error(data?.message ?? "搬送判断の送信に失敗しました。");
  }
  return { statusLabel: data?.statusLabel };
}

export async function searchCases<TResponse>(query: string, limit = 200): Promise<TResponse> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  params.set("limit", String(limit));

  const res = await fetch(`/api/cases/search?${params.toString()}`, { cache: "no-store" });
  const data = await parseJson<TResponse & ApiErrorPayload>(res);
  if (!res.ok) {
    throw new Error(data?.message ?? "事案一覧の取得に失敗しました。");
  }
  return data as TResponse;
}

export async function searchCaseTargets<TResponse>(caseId: string): Promise<TResponse> {
  const res = await fetch(`/api/cases/search/${encodeURIComponent(caseId)}`, {
    cache: "no-store",
  });
  const data = await parseJson<TResponse & ApiErrorPayload>(res);
  if (!res.ok) {
    throw new Error(data?.message ?? "搬送先候補一覧の取得に失敗しました。");
  }
  return data as TResponse;
}