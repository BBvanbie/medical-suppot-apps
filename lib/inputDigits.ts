export function normalizeAsciiDigits(input: string): string {
  return input.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
}

export function extractAsciiDigits(input: string, maxLength?: number): string {
  const digits = normalizeAsciiDigits(input).replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

export function normalizeAsciiNumberText(input: string): string {
  return normalizeAsciiDigits(input)
    .replace(/[．。]/g, ".")
    .replace(/[ー―−‐]/g, "-");
}
