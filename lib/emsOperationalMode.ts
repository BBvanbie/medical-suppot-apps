import type { EmsOperationalMode } from "@/lib/emsSettingsValidation";

export function getEmsOperationalModeLabel(mode: EmsOperationalMode) {
  return mode === "TRIAGE" ? "トリアージ" : "通常運用";
}

export function getEmsOperationalModeShortLabel(mode: EmsOperationalMode) {
  return mode === "TRIAGE" ? "TRIAGE" : "STANDARD";
}

export function isEmsOperationalMode(value: unknown): value is EmsOperationalMode {
  return value === "STANDARD" || value === "TRIAGE";
}

export function getEmsOperationalModeDescription(mode: EmsOperationalMode) {
  return mode === "TRIAGE"
    ? "災害時の初動を優先する並びと案内に切り替えます。統計は補助情報として扱います。"
    : "通常の業務導線と統計の見え方で運用します。";
}

export function getEmsOperationalModeBannerText(mode: EmsOperationalMode) {
  return mode === "TRIAGE"
    ? "トリアージモードで表示中です。新規事案、進行事案、病院検索を優先し、統計は補助情報として扱います。"
    : "通常運用モードです。";
}
