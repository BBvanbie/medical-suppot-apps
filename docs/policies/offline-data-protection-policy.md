# オフライン保存データ保護方針

## 目的

EMS 端末に一時保存される患者情報、受入要請、相談返信、検索キャッシュを、端末紛失・ログアウト・長期放置時に残し続けないための方針を定義する。

## 対象

IndexedDB `medical-support-apps-offline` に保存する以下の store を対象とする。

| store | 主な内容 | 現行保持期間 |
|---|---|---|
| `caseDrafts` | オフライン作成・編集した事案 draft | 同期済み 1日、未同期 14日、AES-GCM 暗号化 |
| `offlineQueue` | 未送信の事案更新、受入要請、相談返信、設定同期 | 14日、AES-GCM 暗号化 |
| `hospitalCache` | 病院検索キャッシュ | 1日、TTL 保護 |
| `searchState` | 検索条件・画面復元用 state | 1日 |
| `emsSettings` | オフライン変更した EMS 設定 | 14日 |
| `syncMeta` | 同期状態 metadata | 30日 |

## 削除条件

- ログアウト時は IndexedDB の全 store と hospital request / case context 系の `sessionStorage` を削除する。
- `OfflineProvider` 起動時に TTL 超過 record を削除する。
- セッション失効・端末未信頼を検知した場合に削除できる helper は用意する。常時 polling は現場操作と E2E の安定性を損なうため、初期実装ではログアウトと起動時 TTL を正本にする。

## 端末キーの扱い

- `security:device-key` は端末登録判定に使うため、通常ログアウトでは削除しない。
- 端末紛失・故障時は admin の端末停止と再登録を正本とする。
- 端末キーを消す操作は、端末登録解除・再登録手順の中で別途扱う。

## 暗号化方針

IndexedDB の暗号化は Web Crypto AES-GCM を使う。第一段階の暗号化対象は患者情報や搬送要請を含む `caseDrafts` と `offlineQueue` とする。

- WebAuthn credential そのものは復号鍵として取り出せない。
- ブラウザ内に暗号鍵を永続保存しない。
- ログイン済み EMS かつ登録端末だけが `/api/security/offline-key` からサーバー由来の暗号鍵を取得できる。
- 暗号鍵は `AUTH_SECRET` または `NEXTAUTH_SECRET` と user / role / team / device key からサーバー側で導出する。
- ログアウト後、セッション失効後、端末未登録状態では鍵を取得できない。
- 旧平文 record は読み取り互換を維持し、読み取り時に暗号化 record へ寄せる。
- `hospitalCache` は患者情報を直接含まないため、第一段階では暗号化ではなく 1日 TTL とログアウト時削除で保護する。

## DB at-rest 暗号化方針

- 本番 PostgreSQL は managed service の storage encryption を必須条件にする。
- backup store も暗号化必須とする。
- DB dump や復元訓練用 backup は、保存先、アクセス権限、保持期間を backup runbook に従って管理する。
- 列単位暗号化は第一段階では入れない。候補は患者氏名、住所、自由記載所見、相談コメントだが、検索・一覧・監査との tradeoff が大きいため別設計で扱う。
- アプリログ、監査ログ、監視イベントには secret、WebAuthn credential、offline key、患者全文 payload を出さない。

## 関連実装

- `lib/offline/offlineRetention.ts`
- `lib/offline/offlineCrypto.ts`
- `lib/offline/offlineDb.ts`
- `lib/secureSignOut.ts`
- `components/offline/OfflineProvider.tsx`
- `app/api/security/offline-key/route.ts`
