# offline conflict handling 強化設計

最終更新: 2026-04-06

## 結論

- 初期段階では automerge を入れない。
- まず `snapshot 基盤 -> conflict classification -> diff UI` を整え、解決導線は `Offline Queue` を正本にする。
- 競合解決は `server 採用 / local 採用して再保存 / あとで確認する` の 3 択から始める。

## 前提と制約

- 現在の競合検知は `baseServerUpdatedAt` 比較中心で、snapshot が不足している。
- 終端状態、request 状態、搬送決定は危険度が高いため、初期段階では server 優先に寄せる。
- UI は複雑にしすぎず、「何が起きたか」「何をすべきか」が即分かることを優先する。

## 方式比較

### 1. すぐ limited automerge まで入れる

- 長所: UX は軽い
- 短所: snapshot / field classification が未整備のままでは危険
- 判断: 不採用

### 2. まず conflict handling を完成させる

- 長所: 安全。実務で事故りにくい
- 短所: 手動解決は残る
- 判断: 採用

## 推奨設計

### スコープ

- 初期対象は `case draft` のみ
- 除外
  - request 状態
  - transport decision / decline
  - terminal state

### 解決導線

- 正本 UI は `Offline Queue`
- conflict item を選択
- detail panel / modal で差分確認
- その場で次を選ぶ
  - server を採用
  - local を採用して再保存
  - あとで確認する

### queue 振る舞い

- `あとで確認する` を選んだ item は `conflict` のまま queue に残す
- `retry all` では conflict item を自動スキップする

## 非目標

- mixed merge
- field-level automerge
- request state / transport decision への適用

## 影響ファイル / 検証方針

- 影響候補
  - `lib/offline/offlineSync.ts`
  - `lib/offline/offlineTypes.ts`
  - `components/settings/OfflineQueuePage.tsx`
  - `components/cases/CaseFormPage.tsx`
- 検証
  - `local only`
  - `server only`
  - same-field conflict
  - `retry all` skip
