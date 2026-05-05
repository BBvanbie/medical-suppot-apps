# 大規模災害TRIAGE P0 UI導線設計

作成日: 2026-05-05

## 1. 目的

大規模災害TRIAGE P0要件、DB設計、API契約を、role別の画面導線と実装単位へ落とす。

対象は、現場の先着隊/統括救急隊、搬送隊、dispatch、hospital、admin/medical control、監査/レポートである。

参照:

- [P0要件定義](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-requirements-design.md)
- [P0 DB設計](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-db-design.md)
- [P0 API契約](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-api-contract-design.md)
- [UI_RULES](/C:/practice/medical-support-apps/docs/UI_RULES.md)

## 2. UI基本方針

- 画面は `first look -> compare -> act` で組む。
- TRIAGEは白赤基調とし、黒基調や装飾目的のgradientは使わない。
- 色だけで状態を伝えず、tag名、人数、残枠、期限、状態badgeを併記する。
- EMSはiPad横向きで、現場で片手でも押せる大きな操作とする。
- dispatch/hospital/adminはPC前提で、一覧比較、絞り込み、監査、例外処理を密度高く配置する。
- P0状態として、loading、empty、error、disabled、read-only、permission-limited、stale/conflict、offline restrictedを必ず設計対象に含める。

## 3. 現行UIの位置づけ

| role | 既存入口 | 現状でできること | P0で不足すること |
| --- | --- | --- | --- |
| dispatch | `components/dispatch/MciIncidentCommandPanel.tsx` | インシデント承認、統括指定、参加隊通知、TRIAGE切替依頼、病院依頼、offer表示 | 統括交代、offer期限/残枠/予約枠、監査timeline、終了レビュー、強制交代/強制終了理由 |
| EMS | `components/ems/EmsMciIncidentPanel.tsx` | 参加確認、統括隊の患者採番、搬送割当、搬送決定 | 仮登録レビュー、非統括隊の仮登録、tag変更履歴、搬送辞退/出発/到着/引継、offer期限警告、offline制限 |
| hospital | `components/hospitals/HospitalMciRequestsPanel.tsx` | MCI依頼確認、色別受入可能人数返信、搬送決定一覧 | offer期限、残枠編集/取消、到着予定確認、受入確認、引継完了 |
| admin/medical control | 未分離 | なし | START/PAT algorithm version管理、訓練/live reset、監査閲覧 |

## 4. 共通画面部品

### 4-1. MCI Status Rail

全roleで画面上部に固定表示する。dispatch/EMS/hospitalで情報量を変える。

表示項目:

- incident code、mode `LIVE/TRAINING`、status、最終更新時刻
- 統括救急隊、前統括救急隊、交代pending有無
- 色別人数 `RED/YELLOW/GREEN/BLACK/UNKNOWN`
- 病院offerの残枠、期限切れ件数、搬送決定済み人数
- 未読通知、未応答隊、offline隊、stale警告

操作:

- dispatch: 統括指定/交代、TRIAGE切替依頼、終了レビュー
- EMS統括: 交代申請、患者レビュー、搬送割当
- EMS搬送隊: 自隊割当確認、搬送ステータス更新
- hospital: offer更新、到着/引継確認

### 4-2. Stale / Conflict Banner

競合や期限切れは画面上部と該当行の両方で表示する。

表示条件:

- offer expired
- capacity exceeded
- patient already assigned
- patient tag updated after selection
- command team changed
- offline sync pending
- read-only due to non-commander

原則:

- 操作不可にするだけでなく、理由と復旧操作を出す。
- `再読み込み`、`最新状態を取得`、`割当を再作成`、`理由を記録して継続` のいずれかを明示する。

## 5. Dispatch MCI Command Console

入口:

- `components/dispatch/MciIncidentCommandPanel.tsx`
- dispatchの事案詳細またはMCIインシデント詳細内の中核panelとして扱う。

### 5-1. First Look

最初に見るべき情報:

- インシデント承認状態
- 統括救急隊と交代要求
- 参加隊数、未応答隊、TRIAGE未切替隊
- 色別傷病者数と前回報告との差分
- 病院offerの総残枠、期限切れ、回答待ち
- 終了可否と終了ブロッカー

### 5-2. Compare

比較領域:

- 参加隊roster: 隊名、方面、mode、接続状態、統括候補申告、最終更新
- 病院offer board: 病院名、色別受入可能、予約済み、搬送決定済み、残枠、期限
- 依頼queue: 未回答、要相談、拒否、期限切れ
- 監査timeline: 統括交代、受入枠変更、搬送割当、強制操作

### 5-3. Act

主要操作:

- 第一報承認とインシデント化
- 統括救急隊の指定、交代、強制交代
- 参加隊へのインシデント通知
- TRIAGE未切替隊への切替依頼
- 病院への集約受入依頼
- 期限切れofferの再依頼
- インシデント終了レビュー、強制終了
- audit/export/report閲覧

### 5-4. Wire

PC 3 columnを基本とする。

| column | 内容 | 主操作 |
| --- | --- | --- |
| left | Incident summary、統括/参加隊、未応答/未切替 | 承認、統括指定、切替依頼 |
| center | Hospital offer board、依頼queue、capacity差分 | 依頼送信、再依頼、期限切れ処理 |
| right | Alerts、audit timeline、closure review | 監査確認、終了、強制操作 |

状態:

- `PENDING_APPROVAL`: 承認/却下以外はdisabled
- `ACTIVE`: 通常操作可能
- `CLOSED`: read-only、report/exportのみ
- `TRAINING`: LIVEと明確に区別し、実データ通知へ混ざらない表示

## 6. EMS Commander Workspace

入口:

- `components/ems/EmsMciIncidentPanel.tsx`
- 統括救急隊に指定されたteamだけ編集可能にする。

### 6-1. First Look

最初に見るべき情報:

- 自隊が統括か、統括交代pendingか
- 仮登録傷病者の未レビュー件数
- 色別患者数と搬送未割当数
- 病院offerの残枠と期限
- 自隊/他隊への搬送割当状況
- offline時に禁止される操作

### 6-2. Compare

比較領域:

- 仮登録inbox: 送信隊、仮番号、START/PAT結果、怪我詳細、重複候補
- 患者board: `P-001` 単位で色、状態、割当先、搬送隊、最終tag変更
- 病院offer panel: 病院、色別残枠、期限、予約済み、搬送決定済み
- 隊別搬送queue: 搬送隊、割当患者、搬送先、status

### 6-3. Act

主要操作:

- 仮登録傷病者を承認、統合、差戻し
- 統括隊による即時患者採番
- START/PAT再評価、手動tag override、理由記録
- 患者、搬送隊、病院offerを選び搬送割当
- 割当の解放、再割当
- 統括交代申請
- 終了レビュー用の現場確認

### 6-4. Wire

iPad横向き3 pane、横scrollなし。

| pane | 内容 | 操作 |
| --- | --- | --- |
| left | 仮登録inbox、重複候補、差戻し理由 | 承認、統合、差戻し |
| center | 患者board、色/状態filter、tag履歴 | 患者選択、再評価、詳細確認 |
| right | Offer/assignment composer、隊選択 | 搬送割当、解放、再割当 |

固定下部action:

- `患者を追加`
- `選択患者を割当`
- `最新状態を取得`
- `統括交代を申請`

offline制限:

- 仮登録作成はoffline可。
- 正式採番、統合、病院枠予約、搬送割当、統括交代はoffline不可。
- offline時は作成済み仮登録を `同期待ち` として残し、正式番号は付けない。

## 7. EMS Transport Team Workspace

対象:

- 統括ではない現場出場隊。
- ただし統括隊が搬送隊を兼ねる場合も同じstatus chainを使う。

### 7-1. First Look

最初に見るべき情報:

- 統括救急隊の隊名と連絡状態
- 自隊の割当患者、搬送先、患者番号
- 搬送status `ASSIGNED -> DECIDED -> DEPARTED -> ARRIVED -> HANDOFF_COMPLETED`
- 期限切れまたは統括側再割当の警告

### 7-2. Act

主要操作:

- 仮登録傷病者の入力、同期
- 自隊割当の受信確認
- 搬送決定
- 搬送辞退、理由入力
- 出発、病院到着、引継完了

### 7-3. Wire

自隊向け画面は2 columnを基本とする。

| column | 内容 | 主操作 |
| --- | --- | --- |
| left | 自隊割当カード、status chain、病院情報 | 搬送決定、辞退、出発、到着 |
| right | 仮登録form、統括隊情報、通知 | 仮登録送信、同期、統括確認 |

現場操作のため、status操作は44px以上のbuttonを使い、確認dialogは短文にする。

## 8. Hospital MCI Requests / Transport Board

入口:

- `components/hospitals/HospitalMciRequestsPanel.tsx`
- 病院側にTRIAGEモードは作らず、通常の選定依頼一覧内でMCI依頼として扱う。

### 8-1. First Look

最初に見るべき情報:

- 新着MCI受入依頼
- 災害概要、START/PAT色別人数、備考
- 自院offerの色別可能人数、期限、残枠
- 搬送決定済み/到着予定/到着済み

### 8-2. Compare

比較領域:

- pending requests: incident、色別人数、要請時刻、期限
- active offers: 色別可能、予約済み、搬送決定済み、残枠、期限
- inbound transports: 患者番号、色、搬送隊、到着status、怪我詳細

### 8-3. Act

主要操作:

- 色別受入可能人数と備考を送信
- offer期限内の人数更新
- offer取消、理由入力
- 搬送到着確認
- 引継完了

制約:

- hospitalは患者割当を直接変更しない。
- 搬送決定前は個別傷病者詳細を主表示しない。
- 搬送決定後に患者番号、色、怪我詳細、搬送隊を表示する。

## 9. Admin / Medical Control

入口:

- 既存admin/settings配下にP0では追加する。
- 将来 `MEDICAL_CONTROL` roleを追加する場合も、初期はADMIN permissionで守る。

### 9-1. START/PAT Algorithm Version

表示:

- 現行承認済みversion
- draft version
- retired version
- 判定rule summary
- 適用開始/終了

操作:

- draft作成
- rule編集
- approve
- retire
- incidentで使われたversionのread-only閲覧

制約:

- 過去incidentに紐づいたversionは破壊的変更不可。
- LIVE適用は二段確認とaudit必須。

### 9-2. Audit / Report

表示:

- incident別audit timeline
- event type filter
- actor role/team filter
- capacity差分
- command transition
- patient tag history

report:

- 終了後サマリー
- 色別人数推移
- 病院別受入/搬送実績
- 隊別搬送実績
- override理由一覧

## 10. 実装コンポーネント分割案

| domain | 追加/分割候補 | 目的 |
| --- | --- | --- |
| dispatch | `MciIncidentStatusRail` | 全体状態と警告の集約 |
| dispatch | `MciCommanderHandoverPanel` | 統括指定/交代/強制交代 |
| dispatch | `MciHospitalOfferBoard` | offer残枠/期限/再依頼 |
| dispatch | `MciClosureReviewPanel` | 終了条件、強制終了理由 |
| dispatch | `MciAuditTimeline` | 監査event閲覧 |
| EMS | `EmsMciCommanderWorkspace` | 統括救急隊の主画面 |
| EMS | `EmsMciPatientReviewInbox` | 仮登録承認/統合/差戻し |
| EMS | `EmsMciPatientBoard` | 患者番号単位の一覧とtag履歴 |
| EMS | `EmsMciAssignmentComposer` | 患者/病院/搬送隊の割当 |
| EMS | `EmsMciTransportAssignmentsPanel` | 自隊搬送status更新 |
| EMS | `EmsMciProvisionalPatientForm` | 非統括隊の仮登録 |
| hospital | `HospitalMciOfferEditor` | 色別受入人数、期限、取消 |
| hospital | `HospitalMciTransportHandoffPanel` | 到着/引継status |
| admin | `AdminTriageAlgorithmVersionsPanel` | START/PAT版管理 |
| shared | `MciTagBadge` / `MciCapacityMeter` | 色/人数/残枠の表現統一 |

## 11. API依存

| UI | 主API |
| --- | --- |
| dispatch承認/統括指定 | `POST /api/dispatch/cases/[caseId]/mci-incident`、`POST /api/dispatch/mci-incidents/[incidentId]/command-transitions` |
| dispatch病院依頼/offer管理 | `POST /api/dispatch/mci-incidents/[incidentId]/hospital-requests`、`POST /api/hospitals/mci-requests/[requestId]` |
| EMS仮登録 | `POST /api/ems/mci-incidents/[incidentId]/provisional-patients` |
| EMS仮登録レビュー | `POST /api/ems/mci-incidents/[incidentId]/patients/[patientId]/review` |
| EMS tag履歴 | `POST /api/ems/mci-incidents/[incidentId]/patients/[patientId]/tag-events` |
| EMS搬送割当 | `POST /api/ems/mci-incidents/[incidentId]/transport-assignments` |
| EMS搬送status | `PATCH /api/ems/mci-incidents/[incidentId]/transport-assignments/[assignmentId]/status` |
| hospital引継 | `PATCH /api/hospitals/mci-transports/[assignmentId]/handoff` |
| audit/report | `GET /api/dispatch/mci-incidents/[incidentId]/audit-events`、`POST /api/dispatch/mci-incidents/[incidentId]/close` |
| algorithm version | `GET/POST/PATCH /api/admin/triage-algorithm-versions` |

既存 `/patients`、`/transport-assignments`、`/decision` は互換維持のため残し、P0 UIは新規APIから段階移行する。

## 12. UI受入観点

- dispatchは、同一incident内の参加隊、未切替隊、病院offer、期限切れ、終了ブロッカーを1画面で判別できる。
- 統括EMSは、仮登録患者を承認/統合/差戻しでき、正式番号は承認後だけ採番される。
- 非統括EMSは、統括救急隊がどこかを常時確認でき、仮登録と自隊割当status更新だけを操作できる。
- hospitalは、TRIAGEモードへ切り替えず、MCI依頼、色別offer、到着/引継を処理できる。
- offer期限切れ、capacity超過、患者再割当、統括交代は、UIとAPIの両方でconflictとして扱う。
- 色判定は文字、badge、人数、説明を併記し、色だけに依存しない。
- EMS画面はiPad横向きで横scrollなし、主要操作buttonは44px以上。
- すべてのroleでempty/error/loading/read-only/offline/stale状態が破綻しない。

## 13. 推奨実装順

1. 既存MCI UIをsubcomponentへ分割し、現行機能を壊さず表示責務を整理する。
2. `MciIncidentStatusRail` と offer期限/残枠のread-only表示を追加する。
3. 統括EMSの仮登録review、患者board、tag履歴を追加する。
4. 搬送status chainとhospital到着/引継UIを追加する。
5. dispatchの統括交代、終了レビュー、audit timelineを追加する。
6. hospital offer編集/取消、期限切れ再依頼導線を追加する。
7. adminのSTART/PAT algorithm version管理を追加する。
8. Playwrightで大規模災害50名、期限切れ、capacity超過、統括交代、offline仮登録を固定する。

## 14. 未決定事項

| decision | 推奨 | 理由 |
| --- | --- | --- |
| Medical Controlを独立roleにするか | 初期はADMIN permission、将来role分離 | 実装量を抑えつつ承認操作の監査は確保できる |
| report出力形式 | 初期は画面 + CSV、後でPDF | まず検証可能性と運用集計を優先する |
| hospital offer期限の指定権限 | hospitalはboundedな期限選択、dispatchは再依頼可能 | 病院側の運用裁量とdispatch統制を両立する |
| 仮登録統合UI | drawerで左右比較 | 現場iPadでmodal全画面より文脈を保てる |
| tag override理由 | required、定型 + 自由記載短文 | 医療安全上の追跡性を確保しつつ入力負荷を抑える |

## 15. 完了定義

- role別の主要導線が実装され、既存MCI E2E互換を壊していない。
- P0 APIの状態競合がUIに表示され、利用者が次操作を判断できる。
- LIVE/TRAININGが画面上で混同されない。
- 病院枠は期限、予約、搬送決定、解放がUIで追跡できる。
- 統括救急隊交代、tag変更、capacity変更、強制終了がaudit timelineに残る。
- 50名搬送、capacity超過、offer期限切れ、統括交代、offline仮登録のE2Eが通る。
