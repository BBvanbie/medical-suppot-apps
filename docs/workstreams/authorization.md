# 認可 workstream

最終更新: 2026-04-12

## 目的

- `cases` / `hospitals` / `admin` 配下の認可判定を共通 helper に寄せる
- ページ表示可否と API 実行可否の差を仕様として明文化する

## 現在の状態

- 状態: 完了
- `cases` / `hospitals` / `admin` 配下の個別 role 判定を共通 helper へ移行済み
- `send-history` / `paramedics decision` は `caseAccess.ts` 経由で team scope を統一済み
- ページ表示可否と API 実行可否の別表を統合仕様書へ追加済み
- 他隊事案アクセス拒否 / 他院 target 更新拒否 / 二重搬送決定競合 / 終端状態再遷移拒否の E2E を追加済み
- 2026-04-12 に admin 配下の page / layout へ `requireAdminUser` を追加し、管理データ取得前の ADMIN role 判定を統一した

## 実施内容

1. [`routeAccess.ts`](/C:/practice/medical-support-apps/lib/routeAccess.ts) を追加し、role-only route 入口を共通化した
2. `app/api/cases/*` / `app/api/hospitals/*` / `app/api/admin/*` の残件を helper 化した
3. [`system-spec-2026-03-29.md`](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md) にページ表示可否と API 実行可否の別表を追加した
4. [`cases-access.spec.ts`](/C:/practice/medical-support-apps/e2e/tests/cases-access.spec.ts) と [`send-history-safety.spec.ts`](/C:/practice/medical-support-apps/e2e/tests/send-history-safety.spec.ts) に拒否系 / 競合系 E2E を追加した
5. [`adminPageAccess.ts`](/C:/practice/medical-support-apps/lib/admin/adminPageAccess.ts) を追加し、admin page / layout の role guard を共通化した
6. [`admin-access.spec.ts`](/C:/practice/medical-support-apps/e2e/tests/admin-access.spec.ts) を追加し、admin page の直アクセス拒否を検証対象にした

## 完了条件

- 残っている個別認可 route が整理済み
- helper 化した API に回帰 E2E がある
- admin page / layout が管理データ取得前に ADMIN role を確認する
- 仕様書に権限表がある

## 関連ファイル

- [`caseAccess.ts`](/C:/practice/medical-support-apps/lib/caseAccess.ts)
- [`routeAccess.ts`](/C:/practice/medical-support-apps/lib/routeAccess.ts)
- [`adminPageAccess.ts`](/C:/practice/medical-support-apps/lib/admin/adminPageAccess.ts)
- [`route.ts`](/C:/practice/medical-support-apps/app/api/cases/send-history/route.ts)
- [`route.ts`](/C:/practice/medical-support-apps/app/api/hospitals/requests/[targetId]/consult/route.ts)

## 関連 plan

- [2026-03-08-case-access-control-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-08-case-access-control-design.md)
- [2026-03-29-safety-hardening-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-29-safety-hardening-design.md)
