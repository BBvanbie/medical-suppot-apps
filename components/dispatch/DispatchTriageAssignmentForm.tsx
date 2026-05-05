"use client";

import { useEffect, useState } from "react";

type AssignmentTarget = {
  caseId: string;
  teamName: string;
  dispatchAddress?: string;
  destination?: string | null;
};

type DispatchTriageAssignmentFormProps = {
  caseId: string;
  dispatchAddress?: string;
  initialDestination?: string | null;
  assignmentTargets?: AssignmentTarget[];
  initialDepartments?: string[];
  flow?: "triage" | "criticalCare";
};

type SearchResult = {
  hospitalId: number;
  hospitalName: string;
  address?: string;
  phone?: string;
  departments?: string[];
  distanceKm?: number | null;
  searchScore?: number;
  scoreSummary?: string[];
};

type DispatchHospitalRequest = {
  targetId: number;
  requestId: string;
  sentAt: string;
  rawStatus: string;
  statusLabel: string;
  hospitalName: string;
  selectedDepartments: string[];
  acceptedCapacity: number | null;
  canSendToEms: boolean;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function DispatchTriageAssignmentForm({
  caseId,
  dispatchAddress = "",
  initialDestination = null,
  assignmentTargets = [],
  initialDepartments = [],
  flow = "triage",
}: DispatchTriageAssignmentFormProps) {
  const isTriageFlow = flow === "triage";
  const [searchType, setSearchType] = useState<"recent" | "municipality" | "hospital">("recent");
  const [searchText, setSearchText] = useState(dispatchAddress);
  const [departmentsText, setDepartmentsText] = useState(initialDepartments.join(","));
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedHospitalIds, setSelectedHospitalIds] = useState<number[]>([]);
  const [requests, setRequests] = useState<DispatchHospitalRequest[]>([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([caseId]);
  const [status, setStatus] = useState<"idle" | "searching" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const targets = assignmentTargets.length > 0 ? assignmentTargets : [{ caseId, teamName: "当該EMS", destination: initialDestination }];
  const selectedDepartments = departmentsText.split(",").map((value) => value.trim()).filter(Boolean);

  useEffect(() => {
    const loadRequests = async () => {
      const res = await fetch(`/api/dispatch/cases/${encodeURIComponent(caseId)}/hospital-requests`);
      const data = (await res.json().catch(() => ({}))) as { rows?: DispatchHospitalRequest[] };
      setRequests(Array.isArray(data.rows) ? data.rows : []);
    };
    void loadRequests();
  }, [caseId]);

  function toggleHospital(hospitalId: number) {
    setSelectedHospitalIds((current) =>
      current.includes(hospitalId) ? current.filter((value) => value !== hospitalId) : [...current, hospitalId],
    );
  }

  function toggleCase(targetCaseId: string) {
    setSelectedCaseIds((current) =>
      current.includes(targetCaseId)
        ? current.filter((value) => value !== targetCaseId)
        : [...current, targetCaseId],
    );
  }

  const searchHospitals = async () => {
    if (status === "searching") return;
    setStatus("searching");
    setMessage("");
    setSearchResults([]);
    setSelectedHospitalIds([]);

    try {
      const body =
        searchType === "hospital"
          ? { searchType, hospitalName: searchText, triage: isTriageFlow, operationalMode: isTriageFlow ? "TRIAGE" : "STANDARD" }
          : searchType === "municipality"
            ? {
                searchType,
                municipality: searchText,
                mode: "or",
                departmentShortNames: selectedDepartments,
                triage: isTriageFlow,
                operationalMode: isTriageFlow ? "TRIAGE" : "STANDARD",
              }
            : {
                searchType,
                address: searchText,
                mode: "or",
                departmentShortNames: selectedDepartments,
                triage: isTriageFlow,
                operationalMode: isTriageFlow ? "TRIAGE" : "STANDARD",
              };
      const res = await fetch("/api/hospitals/recent-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        rows?: SearchResult[];
        profiles?: Array<{ hospitalId: number; hospitalName: string; address?: string; phone?: string }>;
        message?: string;
      };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "病院検索に失敗しました。");
        return;
      }
      const rows = Array.isArray(data.rows) && data.rows.length > 0
        ? data.rows
        : (data.profiles ?? []).map((profile) => ({ ...profile, departments: [] }));
      setSearchResults(rows.slice(0, 8));
      setStatus("idle");
      setMessage(rows.length > 0 ? `${rows.length}件の候補を表示しました。` : "候補が見つかりませんでした。");
    } catch {
      setStatus("error");
      setMessage("病院検索に失敗しました。");
    }
  };

  const sendRequests = async () => {
    const hospitals = searchResults.filter((row) => selectedHospitalIds.includes(row.hospitalId));
    if (hospitals.length === 0 || status === "sending") return;
    setStatus("sending");
    setMessage("");

    try {
      const res = await fetch(`/api/dispatch/cases/${encodeURIComponent(caseId)}/hospital-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitals: hospitals.map((hospital) => ({
            hospitalId: hospital.hospitalId,
            hospitalName: hospital.hospitalName,
            departments: hospital.departments ?? selectedDepartments,
            distanceKm: hospital.distanceKm ?? null,
          })),
          selectedDepartments,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { rows?: DispatchHospitalRequest[]; message?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "受入依頼の送信に失敗しました。");
        return;
      }
      setRequests(Array.isArray(data.rows) ? data.rows : requests);
      setSelectedHospitalIds([]);
      setStatus("success");
      setMessage(isTriageFlow ? "病院へTRIAGE受入依頼を送信しました。" : "病院へ救命・CCU選定依頼を送信しました。");
    } catch {
      setStatus("error");
      setMessage("受入依頼の送信に失敗しました。");
    }
  };

  const sendToEms = async (request: DispatchHospitalRequest) => {
    const targetCaseIds = selectedCaseIds.length > 0 ? selectedCaseIds : [caseId];
    if (request.acceptedCapacity != null && targetCaseIds.length > request.acceptedCapacity) {
      setStatus("error");
      setMessage(`受入可能人数 ${request.acceptedCapacity}名を超えてEMSへ送信できません。`);
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const body = {
        sourceTargetId: request.targetId,
        targetCaseIds,
      };
      const res = await fetch(`/api/dispatch/cases/${encodeURIComponent(caseId)}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        setStatus("error");
        setMessage(data?.message ?? "EMSへの送信に失敗しました。");
        return;
      }
      setStatus("success");
      setMessage(
        isTriageFlow
          ? `${targetCaseIds.length}隊へ受入可能病院を送信しました。EMS側で搬送決定できます。`
          : "依頼元EMSへ受入可能病院を送信しました。EMS側で搬送決定できます。",
      );
    } catch {
      setStatus("error");
      setMessage("EMSへの送信に失敗しました。");
    }
  };

  return (
    <div className={`mt-3 rounded-2xl border px-3 py-3 ${isTriageFlow ? "border-rose-100 bg-rose-50/50" : "border-amber-100 bg-amber-50/50"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`ds-text-2xs font-semibold ds-track-section ${isTriageFlow ? "text-rose-700" : "text-amber-700"}`}>
            {isTriageFlow ? "TRIAGE DISPATCH FLOW" : "CRITICAL CARE DISPATCH FLOW"}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {isTriageFlow ? "病院検索 → 受入依頼 → EMSへ送信" : "病院検索 → 本部選定依頼 → EMSへ返送"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void searchHospitals()}
          disabled={status === "searching"}
          className={`inline-flex h-9 items-center rounded-xl px-3 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
            isTriageFlow ? "bg-rose-600 hover:bg-rose-500" : "bg-amber-600 hover:bg-amber-500"
          }`}
        >
          {status === "searching" ? "検索中" : "病院検索"}
        </button>
      </div>

      <div className="mt-3 grid gap-2 ds-grid-lg-mci-assignment">
        <select
          value={searchType}
          onChange={(event) => setSearchType(event.target.value as "recent" | "municipality" | "hospital")}
          className={`h-10 rounded-xl border bg-white px-3 text-sm font-semibold text-slate-800 outline-none ${isTriageFlow ? "border-rose-200 focus:border-rose-500" : "border-amber-200 focus:border-amber-500"}`}
        >
          <option value="recent">住所周辺</option>
          <option value="municipality">市区町村</option>
          <option value="hospital">病院名</option>
        </select>
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className={`h-10 rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none ${isTriageFlow ? "border-rose-200 focus:border-rose-500" : "border-amber-200 focus:border-amber-500"}`}
          placeholder="住所、市区町村、病院名"
        />
        <input
          value={departmentsText}
          onChange={(event) => setDepartmentsText(event.target.value)}
          className={`h-10 rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none ${isTriageFlow ? "border-rose-200 focus:border-rose-500" : "border-amber-200 focus:border-amber-500"}`}
          placeholder={isTriageFlow ? "診療科コード 任意: ortho,surgery" : "救命,CCUネ など"}
        />
      </div>

      {searchResults.length > 0 ? (
        <div className="mt-3 space-y-2">
          {searchResults.map((hospital) => (
            <label key={hospital.hospitalId} className="flex cursor-pointer items-start gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-rose-100">
              <input
                type="checkbox"
                checked={selectedHospitalIds.includes(hospital.hospitalId)}
                onChange={() => toggleHospital(hospital.hospitalId)}
                className="mt-1 h-4 w-4 accent-rose-600"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900">{hospital.hospitalName}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">
                  {(hospital.scoreSummary ?? []).join(" / ") || hospital.address || "詳細情報なし"}
                </span>
              </span>
            </label>
          ))}
          <button
            type="button"
            onClick={() => void sendRequests()}
            disabled={selectedHospitalIds.length === 0 || status === "sending"}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            選択病院へ受入依頼
          </button>
        </div>
      ) : null}

      {requests.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-white px-3 py-3 ring-1 ring-rose-100">
          <p className="ds-text-2xs font-semibold ds-track-section text-slate-500">HOSPITAL RESPONSES</p>
          <div className="mt-2 space-y-2">
            {requests.map((request) => (
              <div key={request.targetId} className="grid gap-2 rounded-xl bg-slate-50 px-3 py-3 lg:ds-grid-fluid-action lg:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{request.hospitalName}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {request.statusLabel} / {formatDateTime(request.sentAt)}
                    {request.acceptedCapacity != null ? ` / 受入可能 ${request.acceptedCapacity}名` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void sendToEms(request)}
                  disabled={
                    !request.canSendToEms
                    || status === "sending"
                    || (request.acceptedCapacity != null && selectedCaseIds.length > request.acceptedCapacity)
                  }
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  選択EMSへ送信
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {targets.map((target) => (
              <label key={target.caseId} className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 ring-1 ring-rose-100">
                <input
                  type="checkbox"
                  checked={selectedCaseIds.includes(target.caseId)}
                  onChange={() => toggleCase(target.caseId)}
                  className="h-3.5 w-3.5 accent-rose-600"
                />
                {target.teamName || target.caseId}
              </label>
            ))}
          </div>
          {requests.some((request) => request.acceptedCapacity != null && selectedCaseIds.length > request.acceptedCapacity) ? (
            <p className="mt-2 text-xs font-semibold text-rose-700">選択EMS数が受入可能人数を超えています。送信先を減らしてください。</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs leading-5 text-slate-600 ring-1 ring-rose-100">
        {isTriageFlow
          ? "搬送先は病院からの受入可能応答を受信した後にのみEMSへ送信できます。手入力のみの搬送先指示は搬送決定に接続しないため、このTRIAGEフローでは使用しません。"
          : "救命・CCUの通常事案は本部で病院応答を確認してからEMSへ返送します。EMSは返送された受入可能病院で搬送決定できます。"}
        {initialDestination ? <span className={`ml-1 font-semibold ${isTriageFlow ? "text-rose-700" : "text-amber-700"}`}>現在の送信先: {initialDestination}</span> : null}
      </div>

      {message ? <p className={`mt-2 text-xs font-semibold ${status === "error" ? "text-rose-700" : "text-emerald-700"}`}>{message}</p> : null}
    </div>
  );
}
