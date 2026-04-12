# 環境分離方針

## 目的

`local / staging / production` の役割、DB、secret、通知、MFA、テストデータの扱いを分け、本番データや本番 secret を開発作業に混ぜない。

## 環境定義

| 環境 | 目的 | DB | secret | 通知 | データ |
|---|---|---|---|---|---|
| `local` | 開発、単体確認、Codex 作業 | local または開発用 DB | local 専用 | 原則送信しない | seed / E2E データ |
| `staging` | 本番前検証、リリース確認、MFA / 端末登録 rehearsal | staging 専用 DB | staging 専用 | 検証通知先のみ | 疑似データ |
| `production` | 実運用 | production DB | production 専用 | 本番通知先 | 実データ |

## 分離ルール

- `DATABASE_URL`、`AUTH_SECRET`、`BACKUP_REPORT_TOKEN` は環境ごとに別値にする。
- production secret を local / staging にコピーしない。
- production DB dump を local に直接復元しない。検証に使う場合は匿名化・最小化する。
- WebAuthn credential と端末登録情報は環境ごとに別扱いにする。
- staging の MFA / 端末登録は本番端末を使わず、検証端末または検証 browser profile を使う。
- 通知先は staging と production で必ず分ける。

## 必須 env

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `APP_BASE_URL`
- `BACKUP_REPORT_TOKEN`
- `BACKUP_REPORT_URL`

## リリース前確認

1. migration / schema 変更が staging で通ること
2. `npm run check:full` が通ること
3. 代表 Playwright が staging 相当設定で通ること
4. `/api/health` が `ok: true` を返すこと
5. backup report dry-run が staging 監視画面に反映されること
6. 本番 secret をログや docs に出していないこと

## 関連文書

- [infrastructure-overview.md](/C:/practice/medical-support-apps/docs/policies/infrastructure-overview.md)
- [secret-rotation-runbook.md](/C:/practice/medical-support-apps/docs/operations/secret-rotation-runbook.md)
- [release-runbook.md](/C:/practice/medical-support-apps/docs/operations/release-runbook.md)
