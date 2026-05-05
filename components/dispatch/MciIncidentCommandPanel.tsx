"use client";

import { useEffect, useMemo, useState } from "react";

type Counts = {
  red: number;
  yellow: number;
  green: number;
  black: number;
};

type CandidateTeam = {
  teamId: number;
  teamName: string;
  teamCode: string;
  caseId: string | null;
  isSourceTeam: boolean;
  operationalMode: "STANDARD" | "TRIAGE";
};

type IncidentTeam = {
  id: number;
  teamId: number;
  teamName: string;
  teamCode: string;
  role: "CREATOR" | "COMMAND_CANDIDATE" | "COMMANDER" | "TRANSPORT";
  participationStatus: string;
  operationalModeAtRequest: "STANDARD" | "TRIAGE";
  triageModeRequestedAt: string | null;
};

type Incident = {
  id: number;
  incidentCode: string;
  status: "PENDING_APPROVAL" | "ACTIVE" | "CLOSED";
  address: string;
  awareDate: string | null;
  summary: string;
  notes: string;
  commandTeamId: number | null;
  startCounts: Counts;
  patCounts: Counts;
  teams: IncidentTeam[];
};

type SearchResult = {
  hospitalId: number;
  hospitalName: string;
  address?: string;
  scoreSummary?: string[];
};

type MciHospitalRequest = {
  id: number;
  requestId: string;
  hospitalName: string;
  status: "UNREAD" | "READ" | "NEGOTIATING" | "ACCEPTABLE" | "NOT_ACCEPTABLE";
  sentAt: string;
  offer: {
    id: number;
    red: number;
    yellow: number;
    green: number;
    black: number;
    notes: string;
    respondedAt: string;
  } | null;
};

type MciIncidentCommandPanelProps = {
  caseId: string;
  dispatchAddress?: string;
};

const initialCounts: Counts = {
  red: 0,
  yellow: 0,
  green: 0,
  black: 0,
};

const colorLabels: Array<{ key: keyof Counts; label: string; className: string }> = [
  { key: "red", label: "赤", className: "border-rose-200 bg-rose-50 text-rose-700" },
  { key: "yellow", label: "黄", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { key: "green", label: "緑", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { key: "black", label: "黒", className: "border-slate-300 bg-slate-100 text-slate-800" },
];

function normalizeNumberInput(value: string) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.min(9999, Math.trunc(numberValue)));
}

function getRoleLabel(role: IncidentTeam["role"]) {
  if (role === "COMMANDER") return "統括救急";
  if (role === "CREATOR") return "第一報";
  if (role === "COMMAND_CANDIDATE") return "統括候補";
  return "搬送隊";
}

function CountInputs({
  title,
  counts,
  onChange,
}: {
  title: string;
  counts: Counts;
  onChange: (next: Counts) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-xs font-bold text-slate-900">{title}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {colorLabels.map((color) => (
          <label key={color.key} className={`rounded-xl border px-2 py-2 ${color.className}`}>
            <span className="block ds-text-xs-compact font-bold">{color.label}</span>
            <input
              type="number"
              min={0}
              max={9999}
              value={counts[color.key]}
              onChange={(event) => onChange({ ...counts, [color.key]: normalizeNumberInput(event.target.value) })}
              className="mt-1 h-9 w-full rounded-lg border border-white/80 bg-white px-2 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function MciIncidentCommandPanel({ caseId, dispatchAddress = "" }: MciIncidentCommandPanelProps) {
  const [loading, setLoading] = useState(true);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [candidates, setCandidates] = useState<CandidateTeam[]>([]);
  const [summary, setSummary] = useState(dispatchAddress ? `${dispatchAddress} の大規模災害第一報` : "");
  const [notes, setNotes] = useState("");
  const [startCounts, setStartCounts] = useState<Counts>(initialCounts);
  const [patCounts, setPatCounts] = useState<Counts>(initialCounts);
  const [commandTeamId, setCommandTeamId] = useState<number | "">("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [hospitalSearchText, setHospitalSearchText] = useState(dispatchAddress);
  const [hospitalResults, setHospitalResults] = useState<SearchResult[]>([]);
  const [selectedHospitalIds, setSelectedHospitalIds] = useState<number[]>([]);
  const [hospitalRequests, setHospitalRequests] = useState<MciHospitalRequest[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const untriagedIncidentTeams = useMemo(
    () => (incident?.teams ?? []).filter((team) => team.operationalModeAtRequest !== "TRIAGE"),
    [incident],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/dispatch/cases/${encodeURIComponent(caseId)}/mci-incident`);
        const data = (await res.json().catch(() => ({}))) as {
          incident?: Incident | null;
          candidates?: CandidateTeam[];
          message?: string;
        };
        if (!res.ok) {
          setStatus("error");
          setMessage(data.message ?? "MCIインシデント情報の取得に失敗しました。");
          return;
        }
        setIncident(data.incident ?? null);
        const nextCandidates = Array.isArray(data.candidates) ? data.candidates : [];
        setCandidates(nextCandidates);
        const sourceTeam = nextCandidates.find((candidate) => candidate.isSourceTeam) ?? nextCandidates[0];
        setCommandTeamId(data.incident?.commandTeamId ?? sourceTeam?.teamId ?? "");
        setSelectedTeamIds(data.incident?.teams.map((team) => team.teamId) ?? nextCandidates.map((candidate) => candidate.teamId));
        if (data.incident) {
          setSummary(data.incident.summary);
          setNotes(data.incident.notes);
          setStartCounts(data.incident.startCounts);
          setPatCounts(data.incident.patCounts);
          await loadHospitalRequests(data.incident.id);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [caseId]);

  function toggleTeam(teamId: number) {
    setSelectedTeamIds((current) =>
      current.includes(teamId) ? current.filter((value) => value !== teamId) : [...current, teamId],
    );
  }

  function toggleHospital(hospitalId: number) {
    setSelectedHospitalIds((current) =>
      current.includes(hospitalId) ? current.filter((value) => value !== hospitalId) : [...current, hospitalId],
    );
  }

  const loadHospitalRequests = async (incidentId: number) => {
    const res = await fetch(`/api/dispatch/mci-incidents/${incidentId}/hospital-requests`);
    const data = (await res.json().catch(() => ({}))) as { rows?: MciHospitalRequest[] };
    setHospitalRequests(Array.isArray(data.rows) ? data.rows : []);
  };

  const approveIncident = async () => {
    if (status === "sending") return;
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch(`/api/dispatch/cases/${encodeURIComponent(caseId)}/mci-incident`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary,
          notes,
          startCounts,
          patCounts,
          commandTeamId,
          selectedTeamIds,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { incident?: Incident; message?: string };
      if (!res.ok || !data.incident) {
        setStatus("error");
        setMessage(data.message ?? "MCIインシデント化に失敗しました。");
        return;
      }
      setIncident(data.incident);
      setSelectedTeamIds(data.incident.teams.map((team) => team.teamId));
      await loadHospitalRequests(data.incident.id);
      setStatus("success");
      setMessage("インシデント化し、統括救急隊と各隊へ通知しました。");
    } catch {
      setStatus("error");
      setMessage("MCIインシデント化に失敗しました。");
    }
  };

  const requestModeSwitch = async () => {
    if (!incident || status === "sending") return;
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch(`/api/dispatch/mci-incidents/${incident.id}/triage-mode-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as { notifiedTeamIds?: number[]; message?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "TRIAGE切替依頼に失敗しました。");
        return;
      }
      setStatus("success");
      setMessage(`${data.notifiedTeamIds?.length ?? 0}隊へTRIAGE切替依頼を送信しました。`);
    } catch {
      setStatus("error");
      setMessage("TRIAGE切替依頼に失敗しました。");
    }
  };

  const searchHospitals = async () => {
    if (status === "sending") return;
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/hospitals/recent-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchType: "recent",
          address: hospitalSearchText,
          mode: "or",
          triage: true,
          operationalMode: "TRIAGE",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        rows?: SearchResult[];
        profiles?: SearchResult[];
        message?: string;
      };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "病院検索に失敗しました。");
        return;
      }
      const rows = Array.isArray(data.rows) && data.rows.length > 0 ? data.rows : data.profiles ?? [];
      setHospitalResults(rows.slice(0, 10));
      setSelectedHospitalIds([]);
      setStatus("idle");
      setMessage(rows.length > 0 ? `${rows.length}件の候補を表示しました。` : "病院候補が見つかりませんでした。");
    } catch {
      setStatus("error");
      setMessage("病院検索に失敗しました。");
    }
  };

  const sendHospitalRequests = async () => {
    if (!incident || status === "sending") return;
    const hospitals = hospitalResults.filter((hospital) => selectedHospitalIds.includes(hospital.hospitalId));
    if (hospitals.length === 0) {
      setStatus("error");
      setMessage("依頼先病院を選択してください。");
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch(`/api/dispatch/mci-incidents/${incident.id}/hospital-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitals: hospitals.map((hospital) => ({
            hospitalId: hospital.hospitalId,
            hospitalName: hospital.hospitalName,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { rows?: MciHospitalRequest[]; message?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "MCI受入依頼の送信に失敗しました。");
        return;
      }
      setHospitalRequests(Array.isArray(data.rows) ? data.rows : hospitalRequests);
      setSelectedHospitalIds([]);
      setStatus("success");
      setMessage("MCI受入依頼を送信しました。病院は色別受入可能人数で返信します。");
    } catch {
      setStatus("error");
      setMessage("MCI受入依頼の送信に失敗しました。");
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-red-200 bg-white px-3 py-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ds-text-2xs font-semibold ds-track-eyebrow text-red-700">MCI INCIDENT COMMAND</p>
          <p className="mt-1 text-sm font-bold text-slate-950">大規模災害インシデント化・統括救急隊指定</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            第一報を承認すると、同一現場・同一覚知日のTRIAGE本部報告から参加隊を束ねます。
          </p>
        </div>
        {incident ? (
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
            {incident.incidentCode} / {incident.status}
          </span>
        ) : null}
      </div>

      {loading ? <p className="mt-3 text-xs text-slate-500">読み込み中...</p> : null}

      {!loading && candidates.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          同一現場・同一覚知日の出場隊候補がありません。住所と覚知日が入ったTRIAGE本部報告が必要です。
        </p>
      ) : null}

      {incident ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-xl bg-red-50 px-3 py-3 text-xs leading-5 text-red-900 ring-1 ring-red-100">
              <span className="font-bold">災害概要: </span>
              {incident.summary || "-"}
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-700 ring-1 ring-slate-100">
              <span className="font-bold">備考: </span>
              {incident.notes || "-"}
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-100">
              <p className="ds-text-xs-compact font-bold text-slate-500">START人数</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                赤{incident.startCounts.red} / 黄{incident.startCounts.yellow} / 緑{incident.startCounts.green} / 黒{incident.startCounts.black}
              </p>
            </div>
            <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-100">
              <p className="ds-text-xs-compact font-bold text-slate-500">PAT人数</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                赤{incident.patCounts.red} / 黄{incident.patCounts.yellow} / 緑{incident.patCounts.green} / 黒{incident.patCounts.black}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {incident.teams.map((team) => (
              <div key={team.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {team.teamName}
                    <span className="ml-2 text-xs text-slate-500">({team.teamCode})</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {getRoleLabel(team.role)} / {team.participationStatus}
                    {team.triageModeRequestedAt ? " / 切替依頼済み" : ""}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 ds-text-xs-compact font-bold ${team.operationalModeAtRequest === "TRIAGE" ? "bg-red-50 text-red-700" : "bg-slate-200 text-slate-700"}`}>
                  {team.operationalModeAtRequest}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void requestModeSwitch()}
            disabled={status === "sending" || untriagedIncidentTeams.length === 0}
            className="inline-flex h-10 items-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            未切替隊へTRIAGE切替依頼
          </button>
          <div className="rounded-2xl border border-red-100 bg-red-50/40 px-3 py-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="ds-min-w-panel flex-1">
                <span className="text-xs font-bold text-red-800">MCI病院検索</span>
                <input
                  value={hospitalSearchText}
                  onChange={(event) => setHospitalSearchText(event.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-red-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-red-500"
                  placeholder="住所・地域"
                />
              </label>
              <button
                type="button"
                onClick={() => void searchHospitals()}
                disabled={status === "sending"}
                className="inline-flex h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                病院検索
              </button>
              <button
                type="button"
                onClick={() => void sendHospitalRequests()}
                disabled={status === "sending" || selectedHospitalIds.length === 0}
                className="inline-flex h-10 items-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                選択病院へMCI受入依頼
              </button>
            </div>
            {hospitalResults.length > 0 ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {hospitalResults.map((hospital) => (
                  <label key={hospital.hospitalId} className="flex cursor-pointer items-start gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-red-100">
                    <input
                      type="checkbox"
                      checked={selectedHospitalIds.includes(hospital.hospitalId)}
                      onChange={() => toggleHospital(hospital.hospitalId)}
                      className="mt-1 h-4 w-4 accent-red-600"
                    />
                    <span className="min-w-0">
                      <span className="block font-bold text-slate-900">{hospital.hospitalName}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                        {(hospital.scoreSummary ?? []).join(" / ") || hospital.address || "詳細情報なし"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : null}
            {hospitalRequests.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="ds-text-xs-compact font-bold ds-track-label text-red-800">MCI HOSPITAL OFFERS</p>
                {hospitalRequests.map((request) => (
                  <div key={request.id} className="grid gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-red-100 md:ds-grid-fluid-action">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{request.hospitalName}</p>
                      <p className="mt-0.5 text-xs text-slate-600">{request.status} / {request.requestId}</p>
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      {request.offer
                        ? `赤${request.offer.red} / 黄${request.offer.yellow} / 緑${request.offer.green} / 黒${request.offer.black}`
                        : "返信待ち"}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!incident && candidates.length > 0 ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">災害概要</span>
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600">備考</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500"
                placeholder="危険情報、集結場所、通信補足など"
              />
            </label>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <CountInputs title="START法 色別人数" counts={startCounts} onChange={setStartCounts} />
            <CountInputs title="PAT / 解剖学的評価 色別人数" counts={patCounts} onChange={setPatCounts} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="grid gap-2 md:ds-grid-narrow-wide">
              <label>
                <span className="text-xs font-bold text-slate-600">統括救急隊</span>
                <select
                  value={commandTeamId}
                  onChange={(event) => setCommandTeamId(Number(event.target.value))}
                  className="mt-1 h-10 w-full rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-500"
                >
                  {candidates.map((candidate) => (
                    <option key={candidate.teamId} value={candidate.teamId}>
                      {candidate.teamName}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <p className="text-xs font-bold text-slate-600">参加依頼先</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {candidates.map((candidate) => (
                    <label key={candidate.teamId} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      <input
                        type="checkbox"
                        checked={selectedTeamIds.includes(candidate.teamId)}
                        onChange={() => toggleTeam(candidate.teamId)}
                        className="h-3.5 w-3.5 accent-red-600"
                      />
                      {candidate.teamName}
                      <span className={candidate.operationalMode === "TRIAGE" ? "text-red-700" : "text-slate-400"}>
                        {candidate.operationalMode}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void approveIncident()}
            disabled={status === "sending" || !summary.trim() || !commandTeamId}
            className="inline-flex h-10 items-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            大規模災害インシデント化
          </button>
        </div>
      ) : null}

      {message ? <p className={`mt-2 text-xs font-semibold ${status === "error" ? "text-rose-700" : "text-emerald-700"}`}>{message}</p> : null}
    </div>
  );
}
