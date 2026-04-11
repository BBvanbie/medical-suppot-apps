const ENCRYPTION_VERSION = 1;
const ENCRYPTED_MARKER = "__encryptedOfflineRecord";

type EncryptedOfflineRecord = {
  [ENCRYPTED_MARKER]: true;
  version: typeof ENCRYPTION_VERSION;
  algorithm: "AES-GCM";
  keyVersion: string;
  iv: string;
  ciphertext: string;
};

let keyPromise: Promise<{ key: CryptoKey; keyVersion: string }> | null = null;

function isBrowserCryptoAvailable() {
  return typeof window !== "undefined" && typeof crypto !== "undefined" && Boolean(crypto.subtle);
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function getOfflineCryptoKey() {
  if (!isBrowserCryptoAvailable()) return null;
  if (keyPromise) return keyPromise;

  keyPromise = (async () => {
    const response = await fetch("/api/security/offline-key", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Offline encryption key is not available.");
    }
    const payload = (await response.json()) as { key?: string; keyVersion?: string };
    if (!payload.key || !payload.keyVersion) {
      throw new Error("Offline encryption key response is invalid.");
    }
    const rawKey = decodeBase64(payload.key);
    const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt", "decrypt"]);
    return { key, keyVersion: payload.keyVersion };
  })();

  return keyPromise;
}

export function isEncryptedOfflineRecord(value: unknown): value is EncryptedOfflineRecord {
  return Boolean(value && typeof value === "object" && (value as Record<string, unknown>)[ENCRYPTED_MARKER] === true);
}

export async function encryptOfflineRecord<T>(value: T): Promise<EncryptedOfflineRecord | T> {
  const keyState = await getOfflineCryptoKey().catch(() => null);
  if (!keyState) return value;

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, keyState.key, plaintext);

  return {
    [ENCRYPTED_MARKER]: true,
    version: ENCRYPTION_VERSION,
    algorithm: "AES-GCM",
    keyVersion: keyState.keyVersion,
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptOfflineRecord<T>(value: unknown): Promise<T | null> {
  if (!isEncryptedOfflineRecord(value)) return (value as T | undefined) ?? null;

  const keyState = await getOfflineCryptoKey().catch(() => null);
  if (!keyState || keyState.keyVersion !== value.keyVersion) return null;

  try {
    const iv = decodeBase64(value.iv);
    const ciphertext = decodeBase64(value.ciphertext);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, keyState.key, ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    return null;
  }
}
