# Admin/HOSPITAL navigation performance design

## 背景

- Admin と HOSPITAL の主要導線で、初回 route 遷移と一覧からの detail/history 展開に待ちが残っていた。
- focused benchmark を Admin / HOSPITAL へ拡張し、Admin は `home -> cases`、`case-expand`、`case-detail-open`、HOSPITAL は `home -> requests`、`request-detail-open`、`requests -> consults`、`consults -> patients` を比較対象にした。

## 制約

- Admin は一覧 + detail workbench 構成を維持する。
- HOSPITAL は requests detail / consult flow の既存操作感を変えない。
- role boundary、mode boundary、既存通知挙動を崩さない。

## 方針

1. sidebar route prefetch を Admin / HOSPITAL shell に追加し、主要ページ間の route 遷移を短縮する。
2. Admin cases list は上位案件の selection history を API 応答に同梱し、初回 expand を network 待ちなしへ寄せる。
3. Admin cases detail fetch は in-flight request を共有し、background prewarm と user click の重複 fetch を防ぐ。
4. HOSPITAL request detail は detail cache と上位案件 prewarm を導入し、最初の detail open を短くする。

## 非目標

- Admin cases API の全面再設計
- HOSPITAL request detail の UI 再構成
- production SLA の確定

## 検証方針

- `npm run check`
- `npm run check:full`
- `npx.cmd playwright test e2e/tests/navigation-perf.spec.ts`
