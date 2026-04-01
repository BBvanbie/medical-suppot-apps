# ロール別権限表

最終更新: 2026-04-01

この文書は lookup 用の権限表です。正本の説明は [`system-spec-2026-03-29.md`](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md) を参照します。

## 画面アクセス

| 画面 / ドメイン | EMS | HOSPITAL | ADMIN | DISPATCH |
| --- | --- | --- | --- | --- |
| `/cases/new` | 作成可 | 不可 | 不可 | 不可 |
| `/cases/search` | 自隊のみ | 不可 | 全件 read-only | 不可 |
| `/cases/[caseId]` | 自隊編集可 | 不可 | 全件 read-only | 不可 |
| `/hospitals/search`, `/hospitals/request/*` | 可 | 不可 | 不可 | 不可 |
| `/hospitals/*` 本体 | 不可 | 自院のみ | 不可 | 不可 |
| `/settings/*` | 可 | 不可 | 不可 | 不可 |
| `/hp/settings/*` | 不可 | 可 | 不可 | 不可 |
| `/admin/*` | 不可 | 不可 | 可 | 不可 |
| `/dispatch/*` | 不可 | 不可 | 可 | 可 |

## 更新権限

| 操作 | EMS | HOSPITAL | ADMIN | DISPATCH |
| --- | --- | --- | --- | --- |
| 事案作成 / 更新 | 自隊のみ | 不可 | 不可 | 起票のみ |
| 病院 target への搬送判断 | 自隊 target のみ | 不可 | 不可 | 不可 |
| 病院 target への応答 | 不可 | 自院 target のみ | 不可 | 不可 |
| 相談返信 | 自隊 target のみ | 自院 target のみ | 不可 | 不可 |
| 管理 master 更新 | 不可 | 不可 | 可 | 不可 |
| 監査ログ閲覧 | 不可 | 不可 | 可 | 不可 |

## スコープ原則

- EMS は `teamId` で case / target scope を制限する
- HOSPITAL は `hospitalId` で target / settings scope を制限する
- ADMIN は管理 API と read-only 参照を中心に持つ
- owner scope 外アクセスは `forbidden_access_attempt` として監査ログへ残す
