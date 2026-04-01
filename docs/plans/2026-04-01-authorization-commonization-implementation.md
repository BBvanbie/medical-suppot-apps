# 認可共通化 残件実装

日付: 2026-04-01

## 目的

- `cases` / `hospitals` / `admin` 配下に残っていた個別 role 判定を共通 helper に寄せる
- page 表示可否と API 実行可否の差を統合仕様書へ残す
- 拒否系 E2E を追加して回帰を固定する

## 実装内容

- [`routeAccess.ts`](/C:/practice/medical-support-apps/lib/routeAccess.ts) を追加し、`ADMIN` / `HOSPITAL` / `EMS` / `case reader` の route 入口判定を統一した
- [`caseAccess.ts`](/C:/practice/medical-support-apps/lib/caseAccess.ts) を使うべき `send-history` / `paramedics decision` では team scope 判定を helper へ寄せた
- `app/api/admin/*` と `app/api/hospitals/*` の role-only route を共通 helper 経由へ移行した
- [`system-spec-2026-03-29.md`](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md) にページ表示可否と API 実行可否の表を追加した
- [`cases-access.spec.ts`](/C:/practice/medical-support-apps/e2e/tests/cases-access.spec.ts) に他隊 / 他院拒否の E2E を追加した

## 注意点

- case / target の owner scope は `routeAccess.ts` ではなく `caseAccess.ts` を使う
- `ADMIN` の `cases` 画面は read-only 前提で、`POST /api/cases` は引き続き `403`
- 今後 `app/api/admin/*` / `app/api/hospitals/*` / `app/api/cases/*` を追加するときは、まず既存 helper を使う
