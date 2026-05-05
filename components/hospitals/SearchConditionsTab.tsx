"use client";

import { useMemo, useRef, useState } from "react";

import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";
import type { EmsOperationalMode } from "@/lib/emsSettingsValidation";

type Department = {
  id: number;
  name: string;
  shortName: string;
};

type SearchMode = "or" | "and";

export type RecentSearchPayload = {
  address: string;
  departmentShortNames: string[];
  mode: SearchMode;
};

export type MunicipalitySearchPayload = {
  municipality: string;
  departmentShortNames: string[];
  mode: SearchMode;
};

type SearchConditionsTabProps = {
  departments: Department[];
  municipalities: string[];
  hospitals: string[];
  dispatchAddress: string;
  operationalMode?: EmsOperationalMode;
  onRecentSearchExecute: (payload: RecentSearchPayload) => Promise<void>;
  onMunicipalitySearchExecute: (payload: MunicipalitySearchPayload) => Promise<void>;
  onHospitalSearchExecute: (hospitalName: string) => Promise<void>;
  searching: boolean;
};

export function SearchConditionsTab({
  departments,
  municipalities,
  hospitals,
  dispatchAddress,
  operationalMode = "STANDARD",
  onRecentSearchExecute,
  onMunicipalitySearchExecute,
  onHospitalSearchExecute,
  searching,
}: SearchConditionsTabProps) {
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([]);

  const [municipalityInput, setMunicipalityInput] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [showMunicipalitySuggestions, setShowMunicipalitySuggestions] = useState(false);
  const municipalityInputRef = useRef<HTMLInputElement | null>(null);

  const [hospitalInput, setHospitalInput] = useState("");
  const [selectedHospital, setSelectedHospital] = useState("");
  const [showHospitalSuggestions, setShowHospitalSuggestions] = useState(false);

  const filteredMunicipalities = useMemo(() => {
    const q = municipalityInput.trim().toLowerCase();
    if (!q) return [];
    return municipalities.filter((item) => item.toLowerCase().includes(q)).slice(0, 10);
  }, [municipalityInput, municipalities]);

  const filteredHospitals = useMemo(() => {
    const q = hospitalInput.trim().toLowerCase();
    if (!q) return [];
    return hospitals.filter((item) => item.toLowerCase().includes(q)).slice(0, 10);
  }, [hospitalInput, hospitals]);

  const selectedDepartments = departments.filter((d) => selectedDepartmentIds.includes(d.id));
  const selectedDepartmentShortNames = selectedDepartments.map((d) => d.shortName);
  const isTriage = operationalMode === "TRIAGE";
  const canRunStructuredSearch = selectedDepartments.length > 0 || isTriage;
  const primaryButtonClass = isTriage
    ? "rounded-xl border border-rose-500/70 bg-rose-600 px-3 py-2 text-xs font-semibold ds-track-badge text-white ds-shadow-danger-action hover:border-rose-300 hover:bg-rose-500 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
    : `${BUTTON_VARIANT_CLASS.primary} rounded-lg px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:bg-slate-300`;
  const secondaryButtonClass = isTriage
    ? "rounded-xl border border-amber-300/70 bg-rose-700 px-3 py-2 text-xs font-semibold ds-track-badge text-white ds-shadow-emergency-action hover:border-amber-200 hover:bg-rose-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
    : `${BUTTON_BASE_CLASS} rounded-lg border-teal-200 ds-bg-accent-teal-soft px-3 py-1.5 text-xs font-semibold text-teal-700 hover:border-teal-300 hover:bg-teal-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white`;

  const toggleDepartment = (departmentId: number) => {
    setSelectedDepartmentIds((prev) =>
      prev.includes(departmentId) ? prev.filter((id) => id !== departmentId) : [...prev, departmentId],
    );
  };

  const runRecentByMode = async (mode: SearchMode) => {
    await onRecentSearchExecute({
      address: dispatchAddress.trim(),
      departmentShortNames: selectedDepartmentShortNames,
      mode,
    });
  };

  const runMunicipalityByMode = async (mode: SearchMode) => {
    const municipality = (
      selectedMunicipality ||
      municipalityInputRef.current?.value ||
      municipalityInput
    ).trim();
    if (!municipality) return;
    await onMunicipalitySearchExecute({
      municipality,
      departmentShortNames: selectedDepartmentShortNames,
      mode,
    });
  };

  const chooseMunicipality = (value: string) => {
    setSelectedMunicipality(value);
    setMunicipalityInput(value);
    setShowMunicipalitySuggestions(false);
  };

  const chooseHospital = (value: string) => {
    setSelectedHospital(value);
    setHospitalInput(value);
    setShowHospitalSuggestions(false);
  };

  return (
    <div className="space-y-5">
      {isTriage ? (
        <section
          data-testid="hospital-search-triage-fastlane"
          className="overflow-hidden ds-radius-hero border border-rose-200/80 bg-white px-5 py-5 text-slate-900 ds-shadow-emergency"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="ds-text-2xs font-semibold ds-track-max text-rose-700">TRIAGE FAST LANE</p>
              <h2 className="mt-2 ds-text-title-lg font-black ds-track-display-tight text-slate-950">最小入力で候補病院を即比較</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-rose-900">
                トリアージ中は、現場住所と主訴ベースの初動を優先します。診療科が未確定でも候補を出し、確度が上がった時点で科目を絞り込みます。
              </p>
            </div>
            <div className="grid ds-min-w-field gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm">
              <div>
                <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-rose-100/75">MINIMUM INPUT</p>
                <p className="mt-1 font-semibold text-slate-900">現場住所 / 主訴 / 観察メモ</p>
              </div>
              <div>
                <p className="ds-text-2xs font-semibold ds-track-eyebrow-wide text-rose-100/75">DEPARTMENT</p>
                <p className="mt-1 font-semibold text-slate-900">未選択でも検索可</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section
        className={`rounded-2xl p-5 ${
          isTriage
            ? "border border-rose-200/80 bg-rose-50 ds-shadow-emergency-mode-card"
            : "ds-panel-surface"
        }`}
      >
        <h2 className="text-sm font-bold text-slate-800">{isTriage ? "推定診療科カード（任意）" : "選定科目カードエリア（必須）"}</h2>
        <p className="mt-1 text-xs text-slate-500">
          {isTriage
            ? "診療科が未確定でも直近検索 / 市区名検索を実行できます。選択した科目は候補比較の精度向上に使います。"
            : "ここで選択した科目は「直近検索」「市区名検索」の検索ボタン実行時に保持して適用されます。"}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
          {departments.map((department) => {
            const selected = selectedDepartmentIds.includes(department.id);
            return (
              <button
                key={department.id}
                type="button"
                onClick={() => toggleDepartment(department.id)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  selected
                    ? isTriage
                      ? "border-rose-400 bg-rose-100 text-rose-700 ds-shadow-emergency-badge"
                      : "ds-border-accent-blue ds-bg-accent-blue-soft ds-text-accent-blue"
                    : isTriage
                      ? "border-rose-100 bg-white/95 text-slate-700 hover:border-rose-300 hover:bg-rose-50/70"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <p className="text-xs font-semibold">{department.name}</p>
                <p className="ds-text-xs-compact text-slate-500">{department.shortName}</p>
              </button>
            );
          })}
        </div>

        <div
          className={`mt-3 flex items-center justify-between rounded-xl px-3 py-2 ${
            isTriage ? "border border-rose-100 bg-white/80" : "ds-muted-panel border-blue-100/70"
          }`}
        >
          <p className="text-xs text-slate-600">
            選択中:{" "}
            {selectedDepartments.length > 0
              ? selectedDepartments.map((d) => `${d.name}(${d.shortName})`).join(" / ")
              : isTriage
                ? "未指定のまま候補を出します"
                : "-"}
          </p>
          <button
            type="button"
            onClick={() => setSelectedDepartmentIds([])}
            disabled={selectedDepartmentIds.length === 0}
            className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} rounded-lg px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:text-slate-400`}
          >
            全解除
          </button>
        </div>
      </section>

      <section
        className={`rounded-2xl p-5 ${
          isTriage
            ? "border border-rose-200/80 bg-white ds-shadow-emergency-soft"
            : "ds-panel-surface"
        }`}
      >
        <h2 className="text-sm font-bold text-slate-800">1. 直近検索</h2>
        <p className="mt-1 text-xs text-slate-500">
          {isTriage
            ? "現場住所を主軸に最短距離で候補病院を出します。科目未選択でも実行できます。"
            : "現場住所（事案側）と選定科目で OR / AND 検索します。"}
        </p>

        <div
          className={`mt-4 rounded-xl px-3 py-2 ${
            isTriage ? "border border-rose-100 bg-white/80" : "ds-muted-panel border-blue-100/70"
          }`}
        >
          <p className="text-xs font-semibold text-slate-500">現場住所（事案情報参照）</p>
          <p className="mt-1 text-sm text-slate-700">{dispatchAddress.trim() || "未入力"}</p>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => runRecentByMode("or")}
            disabled={searching || !dispatchAddress.trim() || !canRunStructuredSearch}
            className={`${BUTTON_BASE_CLASS} ${primaryButtonClass}`}
          >
            {isTriage ? "周辺候補を即表示" : "OR検索 実行"}
          </button>
          <button
            type="button"
            onClick={() => runRecentByMode("and")}
            disabled={searching || !dispatchAddress.trim() || !canRunStructuredSearch}
            className={`${BUTTON_BASE_CLASS} ${secondaryButtonClass}`}
          >
            {isTriage ? "条件厳しめで比較" : "AND検索 実行"}
          </button>
        </div>
      </section>

      <section
        className={`rounded-2xl p-5 ${
          isTriage
            ? "border border-rose-200/80 bg-white ds-shadow-emergency-soft"
            : "ds-panel-surface"
        }`}
      >
        <h2 className="text-sm font-bold text-slate-800">2. 市区名検索</h2>
        <p className="mt-1 text-xs text-slate-500">
          {isTriage
            ? "住所が粗い場合は市区名だけで候補を並べます。診療科は後から追加できます。"
            : "市区名と選定科目で OR / AND 検索します。"}
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">市区名</span>
          <input
            ref={municipalityInputRef}
            value={municipalityInput}
            onChange={(e) => {
              setMunicipalityInput(e.target.value);
              setSelectedMunicipality("");
              setShowMunicipalitySuggestions(true);
            }}
            onFocus={() => setShowMunicipalitySuggestions(true)}
            onBlur={() => setTimeout(() => setShowMunicipalitySuggestions(false), 120)}
            placeholder="例: 新宿区"
            className="ds-field w-full rounded-xl px-3 py-2 text-sm text-slate-800 outline-none"
          />
        </label>

        {showMunicipalitySuggestions && filteredMunicipalities.length > 0 && (
          <ul className="ds-panel-surface mt-2 max-h-44 overflow-auto rounded-xl shadow-none">
            {filteredMunicipalities.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    chooseMunicipality(item);
                  }}
                  onClick={() => chooseMunicipality(item)}
                  className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => runMunicipalityByMode("or")}
            disabled={searching || !(selectedMunicipality || municipalityInput.trim()) || !canRunStructuredSearch}
            className={`${BUTTON_BASE_CLASS} ${primaryButtonClass}`}
          >
            {isTriage ? "市区候補を即表示" : "OR検索 実行"}
          </button>
          <button
            type="button"
            onClick={() => runMunicipalityByMode("and")}
            disabled={searching || !(selectedMunicipality || municipalityInput.trim()) || !canRunStructuredSearch}
            className={`${BUTTON_BASE_CLASS} ${secondaryButtonClass}`}
          >
            {isTriage ? "科目絞り込み比較" : "AND検索 実行"}
          </button>
        </div>
      </section>

      <section
        className={`rounded-2xl p-5 ${
          isTriage
            ? "border border-rose-200/80 bg-white ds-shadow-emergency-soft"
            : "ds-panel-surface"
        }`}
      >
        <h2 className="text-sm font-bold text-slate-800">3. 個別検索</h2>
        <p className="mt-1 text-xs text-slate-500">
          {isTriage
            ? "搬送先候補が見えている場合は個別病院を直接開きます。診療科は結果タブで必要に応じて選択します。"
            : "病院名オートコンプリートで個別病院を選択して検索します（選定科目の指定は結果タブで行います）。"}
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-500">病院名</span>
          <input
            value={hospitalInput}
            onChange={(e) => {
              setHospitalInput(e.target.value);
              setSelectedHospital("");
              setShowHospitalSuggestions(true);
            }}
            onFocus={() => setShowHospitalSuggestions(true)}
            onBlur={() => setTimeout(() => setShowHospitalSuggestions(false), 120)}
            placeholder="例: 東京救急センター"
            className="ds-field w-full rounded-xl px-3 py-2 text-sm text-slate-800 outline-none"
          />
        </label>

        {showHospitalSuggestions && filteredHospitals.length > 0 && (
          <ul className="ds-panel-surface mt-2 max-h-44 overflow-auto rounded-xl shadow-none">
            {filteredHospitals.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    chooseHospital(item);
                  }}
                  onClick={() => chooseHospital(item)}
                  className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div
          className={`mt-3 flex items-center justify-between rounded-xl px-3 py-2 ${
            isTriage ? "border border-rose-100 bg-white/80" : "ds-muted-panel border-blue-100/70"
          }`}
        >
          <p className="text-xs text-slate-600">選択中: {selectedHospital || "-"}</p>
          <button
            type="button"
            onClick={() => onHospitalSearchExecute(selectedHospital || hospitalInput.trim())}
            disabled={searching || !(selectedHospital || hospitalInput.trim())}
            className={`${BUTTON_BASE_CLASS} ${primaryButtonClass}`}
          >
            {isTriage ? "病院カードを展開" : "検索 実行"}
          </button>
        </div>
      </section>
    </div>
  );
}
