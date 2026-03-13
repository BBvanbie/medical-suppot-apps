---
name: api-implementation
description: 既存の route handler、repository、schema、auth パターンを確認したうえで、API やサーバー側ロジックを小さく安全に実装するための skill。認可、バリデーション、監査、UI 呼び出しの整合が必要なときに使う。
---

# api-implementation

## purpose

- サーバー処理を role-aware かつ型安全に実装し、既存 UI と整合させる。

## use this skill when

- `app/api/`、`lib/*Repository.ts`、schema/validation を変更するとき
- route handler や server-side data flow を追加するとき
- 権限制御や入力検証を伴う機能追加を行うとき

## do not use this skill when

- UI 表示の調整だけを行うとき
- DB モデルの見直しが主目的で、まだスキーマ設計段階のとき

## workflow

1. 近い API と repository/schema のパターンを読む。
2. auth、role、validation、audit の必要性を確認する。
3. UI 呼び出し元と戻り値の整合を保って実装する。
4. 影響ルートの検証方法を整理する。

## output format

- 目的
- 変更したサーバー責務
- 認可/検証ポイント
- 確認コマンド

## quality bar

- `EMS`、`HOSPITAL`、`ADMIN` の認可境界が明確であること
- schema/repository と route handler の責務が混ざっていないこと
- 既存 callers を壊さないこと

## project-specific notes

- auth は `proxy.ts`、Auth.js、role 分離の既存方針を前提にする。
- 送信履歴、設定保存、病院要請系では監査・状態整合を見落とさない。
