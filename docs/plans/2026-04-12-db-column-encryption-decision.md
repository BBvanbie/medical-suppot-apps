# 2026-04-12 DB Column Encryption Decision

## 目的

PostgreSQL の列単位暗号化を今すぐ実装するかを判断し、production 導入前の保存データ保護方針を固定する。

## 結論

- 現時点では列単位暗号化を実装しない。
- production では managed PostgreSQL の storage encryption と encrypted backup store を必須条件にする。
- 患者情報の保護は、まず role / scope 認可、監査ログ、最小表示、ローカル保存暗号化、backup 暗号化で固める。
- 列単位暗号化は、検索、一覧、通知、監査、復旧手順への影響が大きいため、別設計で扱う。

## 今すぐ入れない理由

- `cases.patient_name`、`cases.address`、`cases.case_payload` は EMS / ADMIN の検索、一覧、詳細、offline conflict の基礎になっている。
- `hospital_request_events.note` は相談履歴、通知、監査確認で参照される。
- 暗号化列をそのまま検索できないため、検索用 token、部分一致方針、再暗号化、鍵 rotation、復旧時の鍵管理を同時に設計する必要がある。
- 初期導入では、誤った列暗号化で検索性や緊急時の閲覧性を落とすほうが運用リスクになる。

## 将来候補

優先候補:

- `cases.patient_name`
- `cases.address`
- `cases.case_payload`
- `hospital_request_events.note`

次点候補:

- `notifications.body`
- `audit_logs.payload` のうち患者情報を含み得る field
- backup drill 用 dump の匿名化済み代替データ

## 将来設計で決めること

- 暗号化方式: app-level encryption か DB extension か
- 検索方式: 完全一致 token、prefix token、検索専用正規化列、または検索対象から除外
- 鍵管理: KMS、環境 secret、key version、rotation 手順
- 移行: 既存 plaintext から encrypted への backfill、rollback、検証方法
- 監査: 復号操作の audit、管理者閲覧の扱い
- 復旧: backup restore 時の key availability と restore drill

## 現時点の必須条件

- production PostgreSQL は storage encryption を有効化する。
- backup store は暗号化済み保存先だけを使う。
- production DB dump を local / staging に直接復元しない。
- local / staging 検証には匿名化・最小化データを使う。
- IndexedDB の `caseDrafts` / `offlineQueue` / `hospitalCache` は AES-GCM 暗号化を維持する。

## 関連文書

- [infrastructure-overview.md](/C:/practice/medical-support-apps/docs/policies/infrastructure-overview.md)
- [offline-data-protection-policy.md](/C:/practice/medical-support-apps/docs/policies/offline-data-protection-policy.md)
- [backup-restore-runbook.md](/C:/practice/medical-support-apps/docs/operations/backup-restore-runbook.md)
- [current-work.md](/C:/practice/medical-support-apps/docs/current-work.md)
