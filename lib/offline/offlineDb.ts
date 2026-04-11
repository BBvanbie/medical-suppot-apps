import type {
  OfflineCaseDraft,
  OfflineEmsSettings,
  OfflineHospitalCacheRow,
  OfflineQueueItem,
  OfflineSearchState,
  OfflineSyncMeta,
} from "@/lib/offline/offlineTypes";

const DB_NAME = "medical-support-apps-offline";
const DB_VERSION = 1;

const CASE_DRAFTS_STORE = "caseDrafts";
const OFFLINE_QUEUE_STORE = "offlineQueue";
const HOSPITAL_CACHE_STORE = "hospitalCache";
const SEARCH_STATE_STORE = "searchState";
const EMS_SETTINGS_STORE = "emsSettings";
const SYNC_META_STORE = "syncMeta";

export const OFFLINE_DB_STORES = {
  caseDrafts: CASE_DRAFTS_STORE,
  offlineQueue: OFFLINE_QUEUE_STORE,
  hospitalCache: HOSPITAL_CACHE_STORE,
  searchState: SEARCH_STATE_STORE,
  emsSettings: EMS_SETTINGS_STORE,
  syncMeta: SYNC_META_STORE,
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function ensureIndexedDbAvailable() {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment.");
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

export function openOfflineDb(): Promise<IDBDatabase> {
  ensureIndexedDbAvailable();
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(CASE_DRAFTS_STORE)) {
        db.createObjectStore(CASE_DRAFTS_STORE, { keyPath: "localCaseId" });
      }
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        const store = db.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("localCaseId", "localCaseId", { unique: false });
      }
      if (!db.objectStoreNames.contains(HOSPITAL_CACHE_STORE)) {
        const store = db.createObjectStore(HOSPITAL_CACHE_STORE, { keyPath: "id" });
        store.createIndex("hospitalId", "hospitalId", { unique: false });
        store.createIndex("hospitalName", "hospitalName", { unique: false });
        store.createIndex("municipality", "municipality", { unique: false });
      }
      if (!db.objectStoreNames.contains(SEARCH_STATE_STORE)) {
        db.createObjectStore(SEARCH_STATE_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(EMS_SETTINGS_STORE)) {
        db.createObjectStore(EMS_SETTINGS_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(SYNC_META_STORE)) {
        db.createObjectStore(SYNC_META_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
  });

  return dbPromise;
}

export async function getOfflineRecord<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const db = await openOfflineDb();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const result = await requestToPromise(store.get(key));
  await transactionDone(transaction);
  return (result as T | undefined) ?? null;
}

export async function getAllOfflineRecords<T>(storeName: string): Promise<T[]> {
  const db = await openOfflineDb();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const result = await requestToPromise(store.getAll());
  await transactionDone(transaction);
  return Array.isArray(result) ? (result as T[]) : [];
}

export async function putOfflineRecord<T>(storeName: string, value: T): Promise<void> {
  const db = await openOfflineDb();
  const transaction = db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).put(value);
  await transactionDone(transaction);
}

export async function deleteOfflineRecord(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openOfflineDb();
  const transaction = db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).delete(key);
  await transactionDone(transaction);
}

export async function clearOfflineStore(storeName: string): Promise<void> {
  const db = await openOfflineDb();
  const transaction = db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).clear();
  await transactionDone(transaction);
}

export async function clearAllOfflineStores(): Promise<void> {
  const db = await openOfflineDb();
  const storeNames = Object.values(OFFLINE_DB_STORES);
  const transaction = db.transaction(storeNames, "readwrite");
  for (const storeName of storeNames) {
    transaction.objectStore(storeName).clear();
  }
  await transactionDone(transaction);
}

export async function countOfflineRecords(storeName: string): Promise<number> {
  const db = await openOfflineDb();
  const transaction = db.transaction(storeName, "readonly");
  const result = await requestToPromise(transaction.objectStore(storeName).count());
  await transactionDone(transaction);
  return Number(result ?? 0);
}

export type OfflineDbRecordMap = {
  [CASE_DRAFTS_STORE]: OfflineCaseDraft;
  [OFFLINE_QUEUE_STORE]: OfflineQueueItem;
  [HOSPITAL_CACHE_STORE]: OfflineHospitalCacheRow;
  [SEARCH_STATE_STORE]: OfflineSearchState;
  [EMS_SETTINGS_STORE]: OfflineEmsSettings;
  [SYNC_META_STORE]: OfflineSyncMeta;
};
