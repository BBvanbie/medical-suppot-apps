import { getAllOfflineRecords, OFFLINE_DB_STORES, putOfflineRecord } from "@/lib/offline/offlineDb";
import type { OfflineHospitalCacheRow, OfflineSearchState } from "@/lib/offline/offlineTypes";

export async function cacheHospitalSearchRows(rows: Array<{
  hospitalId: number;
  hospitalName: string;
  municipality?: string;
  address: string;
  phone: string;
  departments: string[];
  distanceKm?: number | null;
}>) {
  await Promise.all(
    rows.map((row) =>
      putOfflineRecord<OfflineHospitalCacheRow>(OFFLINE_DB_STORES.hospitalCache, {
        id: `hospital-${row.hospitalId}`,
        hospitalId: row.hospitalId,
        hospitalName: row.hospitalName,
        municipality: row.municipality,
        address: row.address,
        phone: row.phone,
        departments: row.departments,
        distanceKm: row.distanceKm ?? null,
        cachedAt: new Date().toISOString(),
      }),
    ),
  );
}

export async function saveOfflineSearchState(key: string, payload: unknown) {
  const state: OfflineSearchState = {
    key,
    payload,
    updatedAt: new Date().toISOString(),
  };
  await putOfflineRecord(OFFLINE_DB_STORES.searchState, state);
  return state;
}

export async function searchHospitalsFromCache(query: {
  hospitalName?: string;
  municipality?: string;
  departments?: string[];
}) {
  const rows = await getAllOfflineRecords<OfflineHospitalCacheRow>(OFFLINE_DB_STORES.hospitalCache);
  const hospitalName = query.hospitalName?.trim().toLowerCase() ?? "";
  const municipality = query.municipality?.trim().toLowerCase() ?? "";
  const departments = (query.departments ?? []).map((department) => department.trim()).filter(Boolean);

  return rows.filter((row) => {
    if (hospitalName && !row.hospitalName.toLowerCase().includes(hospitalName)) return false;
    if (municipality && !(row.municipality ?? "").toLowerCase().includes(municipality)) return false;
    if (departments.length > 0 && !departments.every((department) => row.departments.includes(department))) return false;
    return true;
  });
}
