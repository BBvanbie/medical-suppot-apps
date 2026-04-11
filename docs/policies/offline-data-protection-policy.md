# オフライン保存データ保護方針

## 目的

EMS 端末に一時保存される患者情報、受入要請、相談返信、検索キャッシュを、端末紛失・ログアウト・長期放置時に残し続けないための方針を定義する。

## 対象

IndexedDB `medical-support-apps-offline` に保存する以下の store を対象とする。

| store | 主な内容 | 現行保持期間 |
|---|---|---|
| `caseDrafts` | オフライン作成・編集した事案 draft | 同期済み 1日、未同期 14日 |
| `offlineQueue` | 未送信の事案更新、受入要請、相談返信、設定同期 | 14日 |
| `hospitalCache` | 病院検索キャッシュ | 1日 |
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

現段階では TTL と削除条件を先に実装する。IndexedDB の Web Crypto 暗号化は次の制約を踏まえて段階導入する。

- WebAuthn credential そのものは復号鍵として取り出せない。
- ブラウザ内に永続保存した鍵だけで暗号化すると、端末を取得された場合の防御効果は限定的。
- 本番導入時は、セッション由来の短期鍵と端末登録状態を組み合わせ、ログアウトで鍵を破棄する方式を検討する。
- 暗号化対象の第一候補は `caseDrafts`、`offlineQueue`、`hospitalCache` とする。

## 関連実装

- `lib/offline/offlineRetention.ts`
- `lib/offline/offlineDb.ts`
- `lib/secureSignOut.ts`
- `components/offline/OfflineProvider.tsx`
