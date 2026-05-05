"use client";

import { useEffect, useState } from "react";

type Counts = {
  red: number;
  yellow: number;
  green: number;
  black: number;
};

type IncidentTeam = {
  teamId: number;
  teamName: string;
  teamCode: string;
  role: "CREATOR" | "COMMAND_CANDIDATE" | "COMMANDER" | "TRANSPORT";
  participationStatus: string;
};

type Incident = {
  id: number;
  incidentCode: string;
  address: string;
  summary: string;
  commandTeamId: number | null;
  startCounts: Counts;
  patCounts: Counts;
  teams: IncidentTeam[];
};

type Patient = {
  id: number;
  patientNo: string;
  currentTag: "RED" | "YELLOW" | "GREEN" | "BLACK";
  startTag: "RED" | "YELLOW" | "GREEN" | "BLACK" | null;
  patTag: "RED" | "YELLOW" | "GREEN" | "BLACK" | null;
  injuryDetails: string;
  transportAssignmentId: number | null;
};

type HospitalRequest = {
  id: number;
  hospitalName: string;
  status: string;
  offer: {
    id: number;
    red: number;
    yellow: number;
    green: number;
    black: number;
    notes: string;
  } | null;
};

type Assignment = {
  id: number;
  hospitalName: string;
  teamId: number;
  teamName: string;
  status: "DRAFT" | "SENT_TO_TEAM" | "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED" | "ARRIVED";
  patients: Patient[];
};

type Workspace = {
  selfTeamId: number;
  incident: Incident;
  patients: Patient[];
  hospitalRequests: HospitalRequest[];
  assignments: Assignment[];
};

const tagOptions = [
  { value: "RED", label: "赤" },
  { value: "YELLOW", label: "黄" },
  { value: "GREEN", label: "緑" },
  { value: "BLACK", label: "黒" },
] as const;

function tagLabel(tag: string | null) {
  if (tag === "RED") return "赤";
  if (tag === "YELLOW") return "黄";
  if (tag === "GREEN") return "緑";
  if (tag === "BLACK") return "黒";
  return "-";
}

function tagClass(tag: string) {
  if (tag === "RED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (tag === "YELLOW") return "border-amber-200 bg-amber-50 text-amber-700";
  if (tag === "GREEN") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-300 bg-slate-100 text-slate-800";
}

export function EmsMciIncidentPanel() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [currentTag, setCurrentTag] = useState<Patient["currentTag"]>("RED");
  const [startTag, setStartTag] = useState<Patient["currentTag"]>("RED");
  const [patTag, setPatTag] = useState<Patient["currentTag"]>("RED");
  const [injuryDetails, setInjuryDetails] = useState("");
  const [targetTeamId, setTargetTeamId] = useState<number | "">("");
  const [hospitalOfferId, setHospitalOfferId] = useState<number | "">("");
  const [selectedPatientIds, setSelectedPatientIds] = useState<number[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "sending" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  const loadIncidents = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/ems/mci-incidents");
      const data = (await res.json().catch(() => ({}))) as { rows?: Incident[]; message?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "MCIインシデント一覧の取得に失敗しました。");
        return;
      }
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setIncidents(rows);
      const firstId = rows[0]?.id ?? null;
      setSelectedIncidentId((current) => current ?? firstId);
      if (firstId) await loadWorkspace(firstId);
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("MCIインシデント一覧の取得に失敗しました。");
    }
  };

  const loadWorkspace = async (incidentId: number) => {
    const res = await fetch(`/api/ems/mci-incidents/${incidentId}`);
    const data = (await res.json().catch(() => ({}))) as Workspace & { message?: string };
    if (!res.ok) {
      setStatus("error");
      setMessage(data.message ?? "MCIインシデント情報の取得に失敗しました。");
      return;
    }
    setWorkspace(data);
    setSelectedIncidentId(incidentId);
    setTargetTeamId(data.incident.teams.find((team) => team.role !== "COMMANDER")?.teamId ?? data.selfTeamId);
    setHospitalOfferId(data.hospitalRequests.find((request) => request.offer)?.offer?.id ?? "");
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadIncidents();
    }, 0);
    return () => window.clearTimeout(timer);
    // Initial background load only; loadIncidents intentionally reads latest state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCommander = workspace?.incident.commandTeamId === workspace?.selfTeamId;
  const myAssignments = (workspace?.assignments ?? []).filter((assignment) => assignment.teamId === workspace?.selfTeamId);
  const openPatients = (workspace?.patients ?? []).filter((patient) => patient.transportAssignmentId == null);

  function togglePatient(patientId: number) {
    setSelectedPatientIds((current) =>
      current.includes(patientId) ? current.filter((value) => value !== patientId) : [...current, patientId],
    );
  }

  const updateParticipation = async (participationStatus: "JOINED" | "ARRIVED" | "AVAILABLE") => {
    if (!selectedIncidentId) return;
    setStatus("sending");
    setMessage("");
    const res = await fetch(`/api/ems/mci-incidents/${selectedIncidentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participationStatus }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setStatus("error");
      setMessage(data.message ?? "参加状態の更新に失敗しました。");
      return;
    }
    await loadWorkspace(selectedIncidentId);
    setStatus("success");
    setMessage("参加状態を更新しました。");
  };

  const createPatient = async () => {
    if (!selectedIncidentId || !isCommander) return;
    setStatus("sending");
    setMessage("");
    const res = await fetch(`/api/ems/mci-incidents/${selectedIncidentId}/patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentTag, startTag, patTag, injuryDetails }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setStatus("error");
      setMessage(data.message ?? "傷病者番号の作成に失敗しました。");
      return;
    }
    setInjuryDetails("");
    await loadWorkspace(selectedIncidentId);
    setStatus("success");
    setMessage("傷病者番号を作成しました。");
  };

  const createAssignment = async () => {
    if (!selectedIncidentId || !isCommander) return;
    setStatus("sending");
    setMessage("");
    const res = await fetch(`/api/ems/mci-incidents/${selectedIncidentId}/transport-assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetTeamId, hospitalOfferId, patientIds: selectedPatientIds }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setStatus("error");
      setMessage(data.message ?? "搬送割当の送信に失敗しました。");
      return;
    }
    setSelectedPatientIds([]);
    await loadWorkspace(selectedIncidentId);
    setStatus("success");
    setMessage("搬送隊へ割当を送信しました。");
  };

  const decideAssignment = async (assignmentId: number) => {
    if (!selectedIncidentId) return;
    setStatus("sending");
    setMessage("");
    const res = await fetch(`/api/ems/mci-transport-assignments/${assignmentId}/decision`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setStatus("error");
      setMessage(data.message ?? "搬送決定に失敗しました。");
      return;
    }
    await loadWorkspace(selectedIncidentId);
    setStatus("success");
    setMessage("搬送決定を病院へ通知しました。");
  };

  if (incidents.length === 0 && status !== "loading") return null;

  return (
    <section className="ds-radius-hero border border-red-200 bg-white px-4 py-4 ds-shadow-emergency-lift">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ds-text-xs-compact font-bold ds-track-eyebrow text-red-700">MCI FIELD COMMAND</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">大規模災害インシデント</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">統括救急隊、患者番号、搬送割当をここで確認します。</p>
        </div>
        <button
          type="button"
          onClick={() => void loadIncidents()}
          disabled={status === "loading" || status === "sending"}
          className="inline-flex h-9 items-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          更新
        </button>
      </div>

      {incidents.length > 1 ? (
        <select
          value={selectedIncidentId ?? ""}
          onChange={(event) => void loadWorkspace(Number(event.target.value))}
          className="mt-3 h-10 w-full rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-red-500"
        >
          {incidents.map((incident) => (
            <option key={incident.id} value={incident.id}>
              {incident.incidentCode} / {incident.address}
            </option>
          ))}
        </select>
      ) : null}

      {workspace ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-2xl bg-red-50 px-3 py-3 ring-1 ring-red-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-red-600 px-2.5 py-1 ds-text-xs-compact font-bold text-white">{workspace.incident.incidentCode}</span>
              <span className="rounded-full bg-white px-2.5 py-1 ds-text-xs-compact font-bold text-red-700">
                統括: {workspace.incident.teams.find((team) => team.teamId === workspace.incident.commandTeamId)?.teamName ?? "未指定"}
              </span>
              {isCommander ? <span className="rounded-full bg-slate-950 px-2.5 py-1 ds-text-xs-compact font-bold text-white">自隊が統括</span> : null}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">{workspace.incident.summary}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              START 赤{workspace.incident.startCounts.red} / 黄{workspace.incident.startCounts.yellow} / 緑{workspace.incident.startCounts.green} / 黒{workspace.incident.startCounts.black}
              <span className="ml-3">PAT 赤{workspace.incident.patCounts.red} / 黄{workspace.incident.patCounts.yellow} / 緑{workspace.incident.patCounts.green} / 黒{workspace.incident.patCounts.black}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void updateParticipation("JOINED")} className="h-9 rounded-xl bg-red-600 px-3 text-xs font-semibold text-white">参加</button>
            <button type="button" onClick={() => void updateParticipation("ARRIVED")} className="h-9 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700">現着</button>
            <button type="button" onClick={() => void updateParticipation("AVAILABLE")} className="h-9 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700">搬送可能</button>
          </div>

          {isCommander ? (
            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-2xl border border-red-100 bg-red-50/40 px-3 py-3">
                <p className="text-xs font-bold text-red-800">傷病者番号作成</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <select value={currentTag} onChange={(event) => setCurrentTag(event.target.value as Patient["currentTag"])} className="h-10 rounded-xl border border-red-200 bg-white px-2 text-sm font-bold">
                    {tagOptions.map((tag) => <option key={tag.value} value={tag.value}>現在 {tag.label}</option>)}
                  </select>
                  <select value={startTag} onChange={(event) => setStartTag(event.target.value as Patient["currentTag"])} className="h-10 rounded-xl border border-red-200 bg-white px-2 text-sm font-bold">
                    {tagOptions.map((tag) => <option key={tag.value} value={tag.value}>START {tag.label}</option>)}
                  </select>
                  <select value={patTag} onChange={(event) => setPatTag(event.target.value as Patient["currentTag"])} className="h-10 rounded-xl border border-red-200 bg-white px-2 text-sm font-bold">
                    {tagOptions.map((tag) => <option key={tag.value} value={tag.value}>PAT {tag.label}</option>)}
                  </select>
                </div>
                <textarea value={injuryDetails} onChange={(event) => setInjuryDetails(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm" placeholder="怪我の詳細、搬送時注意点" />
                <button type="button" onClick={() => void createPatient()} disabled={status === "sending"} className="mt-2 h-9 rounded-xl bg-red-600 px-3 text-xs font-semibold text-white disabled:bg-slate-300">番号作成</button>
              </div>

              <div className="rounded-2xl border border-red-100 bg-white px-3 py-3">
                <p className="text-xs font-bold text-red-800">搬送割当</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <select value={targetTeamId} onChange={(event) => setTargetTeamId(Number(event.target.value))} className="h-10 rounded-xl border border-red-200 bg-white px-2 text-sm font-bold">
                    {workspace.incident.teams.map((team) => <option key={team.teamId} value={team.teamId}>{team.teamName}</option>)}
                  </select>
                  <select value={hospitalOfferId} onChange={(event) => setHospitalOfferId(Number(event.target.value))} className="h-10 rounded-xl border border-red-200 bg-white px-2 text-sm font-bold">
                    <option value="">受入可能病院枠</option>
                    {workspace.hospitalRequests.filter((request) => request.offer).map((request) => (
                      <option key={request.offer!.id} value={request.offer!.id}>
                        {request.hospitalName} 赤{request.offer!.red}/黄{request.offer!.yellow}/緑{request.offer!.green}/黒{request.offer!.black}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 max-h-44 space-y-1 overflow-auto rounded-xl bg-slate-50 p-2">
                  {openPatients.map((patient) => (
                    <label key={patient.id} className="flex items-center gap-2 rounded-lg bg-white px-2 py-2 text-xs font-semibold ring-1 ring-slate-100">
                      <input type="checkbox" checked={selectedPatientIds.includes(patient.id)} onChange={() => togglePatient(patient.id)} className="h-3.5 w-3.5 accent-red-600" />
                      <span className={`rounded-full border px-2 py-0.5 ${tagClass(patient.currentTag)}`}>{tagLabel(patient.currentTag)} {patient.patientNo}</span>
                      <span className="truncate text-slate-600">{patient.injuryDetails || "詳細なし"}</span>
                    </label>
                  ))}
                  {openPatients.length === 0 ? <p className="px-2 py-3 text-xs text-slate-500">未割当の傷病者はいません。</p> : null}
                </div>
                <button type="button" onClick={() => void createAssignment()} disabled={status === "sending" || !hospitalOfferId || !targetTeamId || selectedPatientIds.length === 0} className="mt-2 h-9 rounded-xl bg-red-600 px-3 text-xs font-semibold text-white disabled:bg-slate-300">搬送隊へ送信</button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-bold ds-track-label text-slate-500">搬送割当</p>
            {(isCommander ? workspace.assignments : myAssignments).map((assignment) => (
              <article key={assignment.id} className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{assignment.teamName} → {assignment.hospitalName}</p>
                  <span className="rounded-full bg-white px-2.5 py-1 ds-text-xs-compact font-bold text-slate-700">{assignment.status}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {assignment.patients.map((patient) => `${tagLabel(patient.currentTag)} ${patient.patientNo}`).join(" / ")}
                </p>
                {!isCommander && assignment.status === "SENT_TO_TEAM" ? (
                  <button type="button" onClick={() => void decideAssignment(assignment.id)} disabled={status === "sending"} className="mt-2 h-9 rounded-xl bg-red-600 px-3 text-xs font-semibold text-white disabled:bg-slate-300">搬送決定を送信</button>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {message ? <p className={`mt-2 text-xs font-semibold ${status === "error" ? "text-rose-700" : "text-emerald-700"}`}>{message}</p> : null}
    </section>
  );
}
