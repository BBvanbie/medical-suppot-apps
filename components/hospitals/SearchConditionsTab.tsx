"use client";

import { useMemo, useRef, useState } from "react";

import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";

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
      <section className="ds-panel-surface rounded-2xl p-5">
        <h2 className="text-sm font-bold text-slate-800">選定科目カードエリア（必須）</h2>
        <p className="mt-1 text-xs text-slate-500">
          ここで選択した科目は「直近検索」「市区名検索」の検索ボタン実行時に保持して適用されます。
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
                    ? "border-[var(--accent-blue)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <p className="text-xs font-semibold">{department.name}</p>
                <p className="text-[11px] text-slate-500">{department.shortName}</p>
              </button>
            );
          })}
        </div>

        <div className="ds-muted-panel mt-3 flex items-center justify-between rounded-xl border-blue-100/70 px-3 py-2">
          <p className="text-xs text-slate-600">
            選択中:{" "}
            {selectedDepartments.length > 0
              ? selectedDepartments.map((d) => `${d.name}(${d.shortName})`).join(" / ")
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

      <section className="ds-panel-surface rounded-2xl p-5">
        <h2 className="text-sm font-bold text-slate-800">1. 直近検索</h2>
        <p className="mt-1 text-xs text-slate-500">現場住所（事案側）と選定科目で OR / AND 検索します。</p>

        <div className="ds-muted-panel mt-4 rounded-xl border-blue-100/70 px-3 py-2">
          <p className="text-xs font-semibold text-slate-500">現場住所（事案情報参照）</p>
          <p className="mt-1 text-sm text-slate-700">{dispatchAddress.trim() || "未入力"}</p>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => runRecentByMode("or")}
            disabled={searching || !dispatchAddress.trim() || selectedDepartments.length === 0}
            className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.primary} rounded-lg px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:bg-slate-300`}
          >
            OR検索 実行
          </button>
          <button
            type="button"
            onClick={() => runRecentByMode("and")}
            disabled={searching || !dispatchAddress.trim() || selectedDepartments.length === 0}
            className={`${BUTTON_BASE_CLASS} rounded-lg border-teal-200 bg-[var(--accent-teal-soft,#ccfbf1)] px-3 py-1.5 text-xs font-semibold text-teal-700 hover:border-teal-300 hover:bg-teal-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white`}
          >
            AND検索 実行
          </button>
        </div>
      </section>

      <section className="ds-panel-surface rounded-2xl p-5">
        <h2 className="text-sm font-bold text-slate-800">2. 市区名検索</h2>
        <p className="mt-1 text-xs text-slate-500">市区名と選定科目で OR / AND 検索します。</p>

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
            disabled={searching || !(selectedMunicipality || municipalityInput.trim()) || selectedDepartments.length === 0}
            className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.primary} rounded-lg px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:bg-slate-300`}
          >
            OR検索 実行
          </button>
          <button
            type="button"
            onClick={() => runMunicipalityByMode("and")}
            disabled={searching || !(selectedMunicipality || municipalityInput.trim()) || selectedDepartments.length === 0}
            className={`${BUTTON_BASE_CLASS} rounded-lg border-teal-200 bg-[var(--accent-teal-soft,#ccfbf1)] px-3 py-1.5 text-xs font-semibold text-teal-700 hover:border-teal-300 hover:bg-teal-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white`}
          >
            AND検索 実行
          </button>
        </div>
      </section>

      <section className="ds-panel-surface rounded-2xl p-5">
        <h2 className="text-sm font-bold text-slate-800">3. 個別検索</h2>
        <p className="mt-1 text-xs text-slate-500">
          病院名オートコンプリートで個別病院を選択して検索します（選定科目の指定は結果タブで行います）。
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

        <div className="ds-muted-panel mt-3 flex items-center justify-between rounded-xl border-blue-100/70 px-3 py-2">
          <p className="text-xs text-slate-600">選択中: {selectedHospital || "-"}</p>
          <button
            type="button"
            onClick={() => onHospitalSearchExecute(selectedHospital || hospitalInput.trim())}
            disabled={searching || !(selectedHospital || hospitalInput.trim())}
            className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.primary} rounded-lg px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:bg-slate-300`}
          >
            検索 実行
          </button>
        </div>
      </section>
    </div>
  );
}
