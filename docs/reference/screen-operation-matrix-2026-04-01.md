# 画面別操作権限表

最終更新: 2026-04-01

## EMS

| 画面 | 主な操作 | 備考 |
| --- | --- | --- |
| `/cases/new` | 新規作成、下書き保存 | EMS のみ |
| `/cases/[caseId]` | 編集、相談、搬送判断、病院検索遷移 | ADMIN は read-only |
| `/cases/search` | 自隊一覧、送信履歴展開、相談 / 搬送判断 | 自隊 case のみ |
| `/hospitals/search` | 検索、病院選択、受入要請送信 | case 文脈つきで利用 |
| `/settings/offline-queue` | キュー確認、再送、競合解決 | EMS のみ |

## HOSPITAL

| 画面 | 主な操作 | 備考 |
| --- | --- | --- |
| `/hospitals/requests` | 既読、要相談、受入可否応答 | 自院 target のみ |
| `/hospitals/consults` | 相談コメント送信 | `NEGOTIATING` 中心 |
| `/hospitals/patients` | 搬送決定患者の参照 | 自院のみ |
| `/hospitals/medical-info` | 診療科状態更新 | 自院設定 |

## ADMIN

| 画面 | 主な操作 | 備考 |
| --- | --- | --- |
| `/admin/cases` | 全件参照 | 事案更新はしない |
| `/admin/hospitals`, `/admin/ambulance-teams`, `/admin/users`, `/admin/devices`, `/admin/orgs` | master 更新、並び替え、有効無効 | ADMIN のみ |
| `/admin/logs` | 監査ログ参照 | ADMIN のみ |
| `/admin/stats` | KPI 参照 | ADMIN のみ |

## DISPATCH

| 画面 | 主な操作 | 備考 |
| --- | --- | --- |
| `/dispatch/new` | 起票 | DISPATCH / ADMIN |
| `/dispatch/cases` | 指令一覧参照 | DISPATCH / ADMIN |
