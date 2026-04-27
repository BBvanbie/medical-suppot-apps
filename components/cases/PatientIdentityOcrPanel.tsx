"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type OcrBirthField = {
  westernYear: string;
  month: string;
  day: string;
};

type OcrFields = {
  name: string | null;
  address: string | null;
  birth: OcrBirthField | null;
};

type OcrResponse = {
  ok: boolean;
  documentType: string;
  message?: string;
  fields: OcrFields;
  warnings: string[];
};

type DocumentType = "drivers_license" | "my_number_card" | "insurance_card" | "eligibility_certificate";

type PatientIdentityOcrPanelProps = {
  onApplyFields: (input: OcrFields) => void;
};

const hiddenInputClass = "sr-only";
const actionButtonClass =
  "inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50";
const selectClass = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700";

const documentTypeOptions: { value: DocumentType; label: string }[] = [
  { value: "drivers_license", label: "運転免許証" },
  { value: "my_number_card", label: "マイナンバーカード" },
  { value: "insurance_card", label: "健康保険証" },
  { value: "eligibility_certificate", label: "資格確認書" },
];

function hasValue(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function PatientIdentityOcrPanel({ onApplyFields }: PatientIdentityOcrPanelProps) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("drivers_license");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<OcrResponse | null>(null);
  const [applyName, setApplyName] = useState(false);
  const [applyAddress, setApplyAddress] = useState(false);
  const [applyBirth, setApplyBirth] = useState(false);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      return;
    }

    const nextUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextUrl;
    });

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    setApplyName(hasValue(result?.fields.name));
    setApplyAddress(hasValue(result?.fields.address));
    setApplyBirth(Boolean(result?.fields.birth));
  }, [result]);

  const hasSelectedValues = useMemo(() => applyName || applyAddress || applyBirth, [applyAddress, applyBirth, applyName]);

  const resetSelection = () => {
    setSelectedFile(null);
    setResult(null);
    setErrorMessage("");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelected = (file: File | null) => {
    setSelectedFile(file);
    setResult(null);
    setErrorMessage("");
  };

  const handleRunOcr = async () => {
    if (!selectedFile) {
      setErrorMessage("画像を選択してください。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("documentType", documentType);
      formData.append("image", selectedFile);

      const response = await fetch("/api/ems/patient-identity-ocr", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as OcrResponse & { message?: string };
      if (!response.ok || !payload.ok) {
        setErrorMessage(payload.message ?? "本人確認書類の読み取りに失敗しました。");
        setResult(payload.ok ? payload : null);
        return;
      }

      setResult(payload);
    } catch {
      setErrorMessage("本人確認書類の読み取りに失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApplyFields({
      name: applyName ? result.fields.name : null,
      address: applyAddress ? result.fields.address : null,
      birth: applyBirth ? result.fields.birth : null,
    });
    resetSelection();
  };

  return (
    <div className="col-span-12 rounded-[20px] border border-dashed border-blue-200/90 bg-blue-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-blue-700">PATIENT OCR</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">本人確認書類を読み取る</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-600">対応書類を選び、候補を確認してチェックした項目だけを反映します。対象は氏名・住所・生年月日です。</p>
        </div>
        <select value={documentType} onChange={(event) => setDocumentType(event.target.value as DocumentType)} className={selectClass} disabled={isSubmitting}>
          {documentTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className={hiddenInputClass}
          onChange={(event) => handleFileSelected(event.target.files?.[0] ?? null)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={hiddenInputClass}
          onChange={(event) => handleFileSelected(event.target.files?.[0] ?? null)}
        />
        <button type="button" onClick={() => cameraInputRef.current?.click()} className={actionButtonClass}>
          撮影する
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className={actionButtonClass}>
          画像を選ぶ
        </button>
        {selectedFile ? (
          <button type="button" onClick={resetSelection} className={actionButtonClass}>
            撮り直す
          </button>
        ) : null}
      </div>

      {previewUrl ? (
        <div className="mt-4 rounded-[18px] border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-700">プレビュー</p>
              <p className="mt-1 text-[11px] text-slate-500">{selectedFile?.name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRunOcr}
                disabled={isSubmitting}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-950 px-3 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isSubmitting ? "OCR 実行中..." : "OK で読み取る"}
              </button>
            </div>
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="本人確認書類のプレビュー" className="max-h-64 w-full object-contain" />
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-[16px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-semibold text-rose-700">
          {errorMessage}
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedFile ? (
              <button type="button" onClick={resetSelection} className={actionButtonClass}>
                撮り直す
              </button>
            ) : null}
            <button type="button" onClick={() => setErrorMessage("")} className={actionButtonClass}>
              このまま手入力する
            </button>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-[18px] border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-700">読み取り結果</p>
              <p className="mt-1 text-[11px] text-slate-500">チェックが入っている項目だけを患者基本情報へ反映します。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={resetSelection} className={actionButtonClass}>
                撮り直す
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!hasSelectedValues}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-3 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                反映する
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <label className="rounded-[16px] border border-slate-200 bg-slate-50/70 p-3">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                <input type="checkbox" checked={applyName} disabled={!hasValue(result.fields.name)} onChange={(event) => setApplyName(event.target.checked)} />
                氏名
              </span>
              <span className="mt-2 block text-sm text-slate-900">{result.fields.name ?? "読み取りできませんでした"}</span>
            </label>

            <label className="rounded-[16px] border border-slate-200 bg-slate-50/70 p-3">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                <input type="checkbox" checked={applyAddress} disabled={!hasValue(result.fields.address)} onChange={(event) => setApplyAddress(event.target.checked)} />
                住所
              </span>
              <span className="mt-2 block text-sm text-slate-900">{result.fields.address ?? "読み取りできませんでした"}</span>
            </label>

            <label className="rounded-[16px] border border-slate-200 bg-slate-50/70 p-3">
              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                <input type="checkbox" checked={applyBirth} disabled={!result.fields.birth} onChange={(event) => setApplyBirth(event.target.checked)} />
                生年月日
              </span>
              <span className="mt-2 block text-sm text-slate-900">
                {result.fields.birth ? `${result.fields.birth.westernYear}-${result.fields.birth.month}-${result.fields.birth.day}` : "読み取りできませんでした"}
              </span>
            </label>
          </div>

          {result.warnings.length > 0 ? (
            <div className="mt-3 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              {result.warnings.join(" / ")}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
