# オフライン競合 UI 強化設計

最終更新: 2026-04-01

## 目的

- EMS のオフライン競合を「気づけるが次に何をすべきか分からない」状態から、すぐ回復操作へ進める状態へ寄せる

## 方針

- 自動マージや差分比較は入れない
- 既存方針の `手動解決` / `server優先` / `再保存` を UI で明確にする
- 競合 item は `OfflineQueue` と `CaseForm` の両方で見えるようにする

## 実装対象

1. `OfflineQueuePage`
   - conflict item の detail panel を専用表示にする
   - `事案へ戻る`
   - `server優先で破棄`
   - 競合理由 / 推奨操作 / baseServerUpdatedAt の表示
2. `CaseFormPage`
   - header エリア内に競合復元 banner を追加
   - `競合内容を確認`
   - `このまま編集`

## 非目標

- server/local の差分比較 UI
- 自動マージ
- HOSPITAL / ADMIN の競合 UI
