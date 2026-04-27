# 大規模災害トリアージ インシデント指揮 実装記録

作成日: 2026-04-27

## 実装範囲

- MCIインシデント用DB foundationを追加した。
  - `triage_incidents`
  - `triage_incident_teams`
  - `triage_patients`
  - `triage_hospital_requests`
  - `triage_hospital_offers`
  - `triage_transport_assignments`
- dispatchはTRIAGE本部報告からMCIインシデントを作成できる。
- 同一現場・同一覚知日のTRIAGE本部報告から参加候補隊を抽出する。
- dispatchは統括救急隊を指定し、参加隊へ通知する。
- dispatchはTRIAGE未切替隊へ切替依頼通知を送れる。
- dispatchはMCIインシデント単位で病院へ集約受入依頼を送れる。
- 病院は通常画面内でMCI受入依頼を確認し、色別受入可能人数と備考を返せる。
- dispatch画面は病院からの色別受入可能人数を確認できる。
- EMS画面はTRIAGEモード未切替でも、参加中MCIインシデント、統括救急隊、参加状態、搬送割当を表示できる。
- 統括救急隊は傷病者番号を `P-001` 形式で自動採番し、START/PAT/current tag、怪我の詳細を登録できる。
- 統括救急隊は病院の色別受入可能人数を超えない範囲で、搬送隊、病院枠、傷病者番号を割り当てられる。
- 搬送隊はMCI搬送割当を受信し、搬送決定を押下できる。
- 病院は搬送決定後に、MCI搬送決定、搬送隊、傷病者番号、怪我の詳細を通常画面内で確認できる。

## 主要ファイル

- migration:
  - `scripts/migration_20260427_0020_mci_triage_incidents.sql`
- schema/repository:
  - `lib/triageIncidentSchema.ts`
  - `lib/triageIncidentRepository.ts`
- dispatch API:
  - `app/api/dispatch/cases/[caseId]/mci-incident/route.ts`
  - `app/api/dispatch/mci-incidents/[incidentId]/triage-mode-requests/route.ts`
  - `app/api/dispatch/mci-incidents/[incidentId]/hospital-requests/route.ts`
- hospital API:
  - `app/api/hospitals/mci-requests/route.ts`
  - `app/api/hospitals/mci-requests/[requestId]/route.ts`
  - `app/api/hospitals/mci-transport-assignments/route.ts`
- EMS API:
  - `app/api/ems/mci-incidents/route.ts`
  - `app/api/ems/mci-incidents/[incidentId]/route.ts`
  - `app/api/ems/mci-incidents/[incidentId]/patients/route.ts`
  - `app/api/ems/mci-incidents/[incidentId]/transport-assignments/route.ts`
  - `app/api/ems/mci-transport-assignments/[assignmentId]/decision/route.ts`
- UI:
  - `components/dispatch/MciIncidentCommandPanel.tsx`
  - `components/ems/EmsMciIncidentPanel.tsx`
  - `components/hospitals/HospitalMciRequestsPanel.tsx`
  - `app/dispatch/cases/page.tsx`
  - `components/home/HomeDashboard.tsx`
  - `app/hospitals/requests/page.tsx`
- E2E:
  - `e2e/tests/mci-triage-incident.spec.ts`
  - `e2e/tests/ems-triage-mode.spec.ts`

## PDCA結果

### 1周目

- DB schema、repository、dispatch API、dispatch UIを追加した。
- `npm run typecheck`で、認証後の`user` null除外が型推論されない問題を検出した。
- route内の認証分岐を明示的なnull/role判定へ修正した。

### 2周目

- migrationとschema verificationを実行した。
- MCI通知に`notifications.target_id`へincident idを入れると、既存FKがhospital request target向けのため不整合になることを検出した。
- MCI通知は`target_id`を使わず、`dedupeKey`、本文、case identityで紐付ける方針へ修正した。

### 3周目

- TRIAGE切替依頼APIのSQLで、`UPDATE ... FROM`内のtarget alias参照がPostgreSQLで不正になることを検出した。
- JOIN条件をWHERE側へ寄せて修正した。
- E2E global setupが新しい`triage_incidents`を消さず、`cases` cleanup時にFKで失敗する問題を検出した。
- `e2e/global-setup.ts`へMCIインシデントcleanupを追加した。

### 4周目

- MCI病院集約依頼と病院側色別返信UI/APIを追加した。
- React lintで初回ロードeffectの同期setState警告を検出した。
- hospital MCI panelの初回ロードをtimer経由にして修正した。

### 5周目

- 既存TRIAGE E2EにMCI往復を同居させると、同一spec内ログイン回数増加によりrate limitの偽陰性が出ることを確認した。
- MCI E2Eを`mci-triage-incident.spec.ts`へ分離し、既存TRIAGE回帰とMCI回帰を別々に安定実行できる形へ修正した。

### 6周目

- ローンチ前の縦導線として、統括救急隊による患者番号作成、搬送隊への割当、搬送隊の搬送決定、病院側のMCI搬送決定受信までを追加した。
- 病院枠の過剰使用を防ぐため、`triage_hospital_offers` の色別受入可能人数に対し、既存割当と追加患者のタグ数を合算してAPIでブロックするようにした。
- EMSホームにはMCIインシデントパネルを常時配置し、TRIAGE未切替隊でも統括救急隊と参加依頼が確認できるようにした。
- MCI E2Eを、病院色別返信後の `P-001` 採番、搬送割当、搬送決定、病院受信まで拡張した。

### 7周目

- MCI E2Eをさらに拡張し、1病院が緑5名を受入可能と返した状況で、統括救急隊が5名を採番し、統括隊自身へ2名、別救急隊へ3名を割り当てる流れを通した。
- 統括隊と別救急隊の双方が搬送決定し、病院側のMCI搬送決定一覧で5名全員の患者番号と怪我の詳細が確認できることを固定した。
- これにより、単一患者のhappy pathではなく、複数隊分配後の「全員搬送決定」までを回帰対象にした。

## 検証

- `npm run db:migrate`
- `npm run db:verify`
- `npm run check`
- `npx.cmd playwright test e2e/tests/ems-triage-mode.spec.ts --reporter=line`
- `npx.cmd playwright test e2e/tests/mci-triage-incident.spec.ts --reporter=line`
- `git diff --check`

## 残りの段階導入

- 統括候補申告UI。
- 各隊の仮登録傷病者を統括救急隊が承認・統合・差戻しする導線。
- dispatchが受けた病院枠を統括救急隊へ送信する専用の明示操作。現状は統括救急隊がMCI workspaceで病院枠を参照できる。
- 搬送辞退、到着、搬送完了などの後続ステータス。
- 現場での患者バーコード/タグ印刷やオフライン時のMCI患者登録同期。
