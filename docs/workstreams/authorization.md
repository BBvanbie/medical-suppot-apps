# 認可 workstream

最終更新: 2026-03-31

## 目的

- `cases` / `hospitals` / `admin` 配下の認可判定を共通 helper に寄せる
- ページ表示可否と API 実行可否の差を仕様として明文化する

## 現在の状態

- 状態: 進行中
- 土台は追加済み
- 主要 target API の一部は共通ガードへ移行済み
- まだ個別判定が残る route がある

## 次にやること

1. [`caseAccess.ts`](/C:/practice/medical-support-apps/lib/caseAccess.ts) を基準に個別認可残りを棚卸しする
2. `app/api/cases/*` / `app/api/hospitals/*` / `app/api/admin/*` の残件を helper 化する
3. ページ表示可否と API 実行可否の別表を [`system-spec-2026-03-29.md`](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md) に追加する
4. 対応 API ごとに拒否系 E2E を追加する

## 完了条件

- 残っている個別認可 route が整理済み
- helper 化した API に回帰 E2E がある
- 仕様書に権限表がある

## 関連ファイル

- [`caseAccess.ts`](/C:/practice/medical-support-apps/lib/caseAccess.ts)
- [`route.ts`](/C:/practice/medical-support-apps/app/api/cases/send-history/route.ts)
- [`route.ts`](/C:/practice/medical-support-apps/app/api/hospitals/requests/[targetId]/consult/route.ts)

## 関連 plan

- [2026-03-08-case-access-control-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-08-case-access-control-design.md)
- [2026-03-29-safety-hardening-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-29-safety-hardening-design.md)
