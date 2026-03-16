import { type Page } from "@playwright/test";

type OfflineHospitalCacheRow = {
  id: string;
  hospitalId: number;
  hospitalName: string;
  municipality?: string;
  address: string;
  phone: string;
  departments: string[];
  distanceKm?: number | null;
  cachedAt: string;
};

export type OfflineQueueItem = {
  id: string;
  type: string;
  localCaseId?: string;
  serverCaseId?: string;
  targetId?: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
  status: string;
  errorMessage?: string | null;
  baseServerUpdatedAt?: string | null;
};

const DB_NAME = "medical-support-apps-offline";
const DB_VERSION = 1;

async function withOfflineDb<T>(page: Page, action: () => Promise<T>) {
  return action();
}

export async function clearOfflineDb(page: Page) {
  await withOfflineDb(page, async () => {
    await page.evaluate(async ({ dbName, dbVersion }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = () => {
          const nextDb = request.result;
          if (!nextDb.objectStoreNames.contains("caseDrafts")) nextDb.createObjectStore("caseDrafts", { keyPath: "localCaseId" });
          if (!nextDb.objectStoreNames.contains("offlineQueue")) {
            const store = nextDb.createObjectStore("offlineQueue", { keyPath: "id" });
            store.createIndex("status", "status", { unique: false });
            store.createIndex("type", "type", { unique: false });
            store.createIndex("localCaseId", "localCaseId", { unique: false });
          }
          if (!nextDb.objectStoreNames.contains("hospitalCache")) {
            const store = nextDb.createObjectStore("hospitalCache", { keyPath: "id" });
            store.createIndex("hospitalId", "hospitalId", { unique: false });
            store.createIndex("hospitalName", "hospitalName", { unique: false });
            store.createIndex("municipality", "municipality", { unique: false });
          }
          if (!nextDb.objectStoreNames.contains("searchState")) nextDb.createObjectStore("searchState", { keyPath: "key" });
          if (!nextDb.objectStoreNames.contains("emsSettings")) nextDb.createObjectStore("emsSettings", { keyPath: "key" });
          if (!nextDb.objectStoreNames.contains("syncMeta")) nextDb.createObjectStore("syncMeta", { keyPath: "key" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
      });

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(["caseDrafts", "offlineQueue", "hospitalCache", "searchState", "emsSettings", "syncMeta"], "readwrite");
        for (const storeName of ["caseDrafts", "offlineQueue", "hospitalCache", "searchState", "emsSettings", "syncMeta"]) {
          transaction.objectStore(storeName).clear();
        }
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Failed to clear offline stores."));
        transaction.onabort = () => reject(transaction.error ?? new Error("Offline store clear aborted."));
      });
      db.close();
    }, { dbName: DB_NAME, dbVersion: DB_VERSION });
  });
}

export async function seedOfflineHospitalCache(page: Page, rows: OfflineHospitalCacheRow[]) {
  await withOfflineDb(page, async () => {
    await page.evaluate(async ({ dbName, dbVersion, items }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = () => {
          const nextDb = request.result;
          if (!nextDb.objectStoreNames.contains("caseDrafts")) nextDb.createObjectStore("caseDrafts", { keyPath: "localCaseId" });
          if (!nextDb.objectStoreNames.contains("offlineQueue")) {
            const store = nextDb.createObjectStore("offlineQueue", { keyPath: "id" });
            store.createIndex("status", "status", { unique: false });
            store.createIndex("type", "type", { unique: false });
            store.createIndex("localCaseId", "localCaseId", { unique: false });
          }
          if (!nextDb.objectStoreNames.contains("hospitalCache")) {
            const store = nextDb.createObjectStore("hospitalCache", { keyPath: "id" });
            store.createIndex("hospitalId", "hospitalId", { unique: false });
            store.createIndex("hospitalName", "hospitalName", { unique: false });
            store.createIndex("municipality", "municipality", { unique: false });
          }
          if (!nextDb.objectStoreNames.contains("searchState")) nextDb.createObjectStore("searchState", { keyPath: "key" });
          if (!nextDb.objectStoreNames.contains("emsSettings")) nextDb.createObjectStore("emsSettings", { keyPath: "key" });
          if (!nextDb.objectStoreNames.contains("syncMeta")) nextDb.createObjectStore("syncMeta", { keyPath: "key" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
      });

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("hospitalCache", "readwrite");
        const store = transaction.objectStore("hospitalCache");
        for (const item of items) store.put(item);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Failed to seed hospital cache."));
        transaction.onabort = () => reject(transaction.error ?? new Error("Hospital cache seed aborted."));
      });
      db.close();
    }, { dbName: DB_NAME, dbVersion: DB_VERSION, items: rows });
  });
}

export async function listOfflineQueueItems(page: Page) {
  return withOfflineDb(page, async () =>
    page.evaluate(async ({ dbName, dbVersion }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
      });

      const result = await new Promise<OfflineQueueItem[]>((resolve, reject) => {
        const transaction = db.transaction("offlineQueue", "readonly");
        const request = transaction.objectStore("offlineQueue").getAll();
        request.onsuccess = () => resolve(Array.isArray(request.result) ? (request.result as OfflineQueueItem[]) : []);
        request.onerror = () => reject(request.error ?? new Error("Failed to read offline queue."));
      });
      db.close();
      return result;
    }, { dbName: DB_NAME, dbVersion: DB_VERSION }),
  );
}

export async function forceOfflineMode(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    window.dispatchEvent(new Event("offline"));
  });
}

export async function forceOnlineMode(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    window.dispatchEvent(new Event("online"));
  });
}

export async function seedOfflineQueueItems(page: Page, items: OfflineQueueItem[]) {
  await withOfflineDb(page, async () => {
    await page.evaluate(async ({ dbName, dbVersion, rows }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = () => {
          const nextDb = request.result;
          if (!nextDb.objectStoreNames.contains("caseDrafts")) nextDb.createObjectStore("caseDrafts", { keyPath: "localCaseId" });
          if (!nextDb.objectStoreNames.contains("offlineQueue")) {
            const store = nextDb.createObjectStore("offlineQueue", { keyPath: "id" });
            store.createIndex("status", "status", { unique: false });
            store.createIndex("type", "type", { unique: false });
            store.createIndex("localCaseId", "localCaseId", { unique: false });
          }
          if (!nextDb.objectStoreNames.contains("hospitalCache")) {
            const store = nextDb.createObjectStore("hospitalCache", { keyPath: "id" });
            store.createIndex("hospitalId", "hospitalId", { unique: false });
            store.createIndex("hospitalName", "hospitalName", { unique: false });
            store.createIndex("municipality", "municipality", { unique: false });
          }
          if (!nextDb.objectStoreNames.contains("searchState")) nextDb.createObjectStore("searchState", { keyPath: "key" });
          if (!nextDb.objectStoreNames.contains("emsSettings")) nextDb.createObjectStore("emsSettings", { keyPath: "key" });
          if (!nextDb.objectStoreNames.contains("syncMeta")) nextDb.createObjectStore("syncMeta", { keyPath: "key" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("offlineQueue", "readwrite");
        const store = transaction.objectStore("offlineQueue");
        for (const row of rows) store.put(row);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Failed to seed offline queue."));
        transaction.onabort = () => reject(transaction.error ?? new Error("Offline queue seed aborted."));
      });
      db.close();
    }, { dbName: DB_NAME, dbVersion: DB_VERSION, rows: items });
  });
}
