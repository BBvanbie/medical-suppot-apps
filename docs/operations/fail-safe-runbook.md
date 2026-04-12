# フェイルセーフ / 制限運転 runbook

## 目的

DB 停止、通知失敗、部分障害が起きたときに、各ロールが何を継続してよいか、何を止めるべきかを固定する。

## 判定入口

1. 外部監視または `ADMIN / 監視` で異常を確認する。
2. `GET /api/health` を確認する。
3. `checks.db = error` の場合は `degraded_db_unavailable` として制限運転へ移る。
4. `checks.db = ok` で通知失敗だけが増えている場合は「通知停止」として扱い、一覧手動更新と電話連絡を併用する。

`/api/health` は `failSafe.rolePolicies` を返す。外部監視や一次対応者は、この内容を暫定運用案内の正本として扱う。

## ロール別制限運転

| ロール | 継続してよいこと | 止めること | 暫定運用 |
|---|---|---|---|
| `EMS` | オフライン下書き確認、offline queue 確認、電話連絡 | オンライン受入要請送信、搬送決定 / 辞退のオンライン確定、未同期データ削除 | offline queue を保持し、重要案件は電話で調整 |
| `HOSPITAL` | 既に表示済みの要請確認、院内調整、電話回答 | 画面更新を正本扱いすること、相談コメント送信前提の運用 | 一覧手動更新と電話連絡を併用し、復旧後に状態確認 |
| `ADMIN` | `/api/health`、外部監視、直近リリース、DB / backup / 通知切り分け | DB復旧前のデータ修正、原因未確認の再デプロイ連打 | DB復旧を優先し、incident / backup runbook に沿って判断 |
| `DISPATCH` | 電話や無線での指令継続、復旧後入力の手元記録 | オンライン登録を正本扱いすること、画面通知だけで連絡済みにすること | 手元記録と電話連絡を正本にし、復旧後に必要分を入力 |

## DB 停止時

### 判断

- `/api/health` が 503
- `checks.db = error`
- 複数ロールで一覧や保存が失敗

### 対応

1. 書き込み系操作を停止案内する。
2. `EMS` は offline queue を削除せず保持する。
3. `HOSPITAL` は電話回答へ切り替える。
4. `DISPATCH` は手元記録へ切り替える。
5. `ADMIN` は DB 復旧、backup 状態、直近 deploy を確認する。
6. 復旧後、未同期 EMS queue、病院回答、dispatch 手元記録を順に突合する。

## 通知失敗時

### 判断

- `ADMIN / 監視` の `通知生成 / 配信失敗` が増加
- 要請や相談のDB更新は成功している
- 相手側の通知ベルだけが増えない

### 対応

1. 主要一覧の手動更新を案内する。
2. 重要案件は電話連絡を併用する。
3. 復旧後に未読通知だけで判断せず、該当時間帯の要請 / 相談履歴を spot check する。
4. `system_monitor_events.notification_failure` の source を確認する。

## 部分障害時

| 障害 | 判断 | 対応 |
|---|---|---|
| EMS だけ保存失敗 | EMS API failure または offline queue 増加 | offline queue 保持、復旧後に手動再送 |
| HOSPITAL だけ一覧失敗 | HOSPITAL request API failure | 電話回答へ切替、復旧後に画面状態確認 |
| ADMIN 監視だけ失敗 | `/api/health` は正常、admin monitoring API failure | 外部監視と `/api/health` を正本にする |
| 通知だけ失敗 | DB更新は成功、通知失敗のみ増加 | 手動更新 + 電話連絡 |

## 復旧後チェック

1. `/api/health` が `200`、`checks.db = ok` である。
2. `ADMIN / 監視` の DB / API / 通知失敗が増え続けていない。
3. `EMS` の offline queue に `failed` / `conflict` が残っていないか確認する。
4. `HOSPITAL` の受入要請一覧で電話回答済み案件と画面状態を突合する。
5. `DISPATCH` の手元記録を必要に応じて入力する。
6. 障害時に電話で決めた搬送先が画面上の搬送決定と一致しているか確認する。

## 関連文書

- [incident-response-runbook.md](/C:/practice/medical-support-apps/docs/operations/incident-response-runbook.md)
- [backup-restore-runbook.md](/C:/practice/medical-support-apps/docs/operations/backup-restore-runbook.md)
- [monitoring-alerting-runbook.md](/C:/practice/medical-support-apps/docs/operations/monitoring-alerting-runbook.md)
- [offline-data-protection-policy.md](/C:/practice/medical-support-apps/docs/policies/offline-data-protection-policy.md)
