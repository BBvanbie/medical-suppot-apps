# Admin/HOSPITAL navigation performance implementation

## 実施内容

1. `e2e/tests/navigation-perf.spec.ts` に Admin benchmark を追加した。
2. `components/admin/AdminSidebar.tsx` と `components/hospitals/HospitalSidebar.tsx` に idle route prefetch を追加した。
3. `app/api/admin/cases/route.ts` は schema check / auth 解決を並列化し、上位3件の selection history を `prefetchedHistory` として同梱するよう変更した。
4. `components/admin/AdminCasesPage.tsx` は history cache / detail cache / in-flight request 共有を追加し、上位案件の detail prewarm を行うよう変更した。
5. `app/api/admin/cases/[caseId]/route.ts` は `caseUid` 既知経路の軽量 history read を使うよう変更した。
6. `components/hospitals/useHospitalRequestApi.ts` は detail/messages cache を追加した。
7. `components/hospitals/HospitalRequestsTable.tsx` は上位案件の detail prewarm を追加した。

## 計測結果

### HOSPITAL

- `hospital:home->requests`: 約 `1358.6ms`
- `hospital:request-detail-open`: 約 `75.9ms`
- `hospital:requests->consults`: 約 `1557.7ms`
- `hospital:consults->patients`: 約 `1485.2ms`

### ADMIN

- baseline
  - `admin:home->cases`: 約 `853.3ms`
  - `admin:case-expand`: 約 `3457.6ms`
  - detail wait condition は summary panel に合わせて補修した
- final
  - `admin:home->cases`: 約 `965.8ms`
  - `admin:case-expand`: 約 `1558.5ms`
  - `admin:case-detail-open`: 約 `1142.6ms`

## 所見

- Admin は `expand` が最も改善幅が大きく、上位案件 history 同梱と in-flight dedupe が効いた。
- HOSPITAL は detail open が十分短く、残る route 遷移は 1.3s - 1.6s 台で安定している。
- focused benchmark は dev 条件のぶれを含むため、今後 production build でも再測定したい。

## 実施確認

- `npm run check`
- `npm run check:full`
- `npx.cmd playwright test e2e/tests/navigation-perf.spec.ts`
