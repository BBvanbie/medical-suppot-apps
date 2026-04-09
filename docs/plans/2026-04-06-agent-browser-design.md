# agent-browser 導入設計

## 結論

`vercel-labs/agent-browser` を devDependency としてローカル導入し、このリポジトリでは AI の実ブラウザ確認用ツールとして扱う。
回帰保証の責務は Playwright に残し、`agent-browser` は exploratory verification に限定する。

## 前提と制約

- 本リポジトリは Next.js 16 / React 19 / Playwright E2E 構成
- ユーザーの希望として `localhost` 起動はユーザー側運用に固定する
- AI は `localhost` が未起動なら起動依頼だけを返し、自動起動しない
- ブラウザ確認の価値が高いのは EMS / HOSPITAL / ADMIN の role 別 UI、モーダル、状態変化、非同期反映
- sandbox 内では `agent-browser` のソケット作成が失敗する場合があり、環境によっては権限昇格が必要

## 方式比較

### 案1. Playwright だけで運用する

- 長所: 既存運用に乗る、CI と相性がよい
- 短所: 対話的な画面調査、簡易再現、目視確認には重い

### 案2. `agent-browser` を補助導入し、Playwright と併用する

- 長所: AI が実ブラウザで開く、見る、押す、入力する、撮るができる
- 長所: exploratory verification と相性がよい
- 短所: 安定した回帰保証には向かず、環境依存の不安定さがある

## 推奨設計

- 案2を採用する
- `package.json` に最小限の導線だけ追加する
  - `npm run browser:install`
  - `npm run browser:close`
- README と専用運用メモに、用途、基本手順、Playwright との役割分担を残す
- `AGENTS.md` に durable rule を追加する
  - `localhost` はユーザー起動
  - UI 実装後は可能なら `agent-browser` で実画面確認
  - selector 決め打ちより snapshot / label / role 優先

## 影響ファイル / 検証方針

- `package.json`
- `README.md`
- `AGENTS.md`
- `docs/reference/agent-browser-operations.md`

検証は以下とする。

- `agent-browser install`
- 実ローカルアプリに対して `open`
- `snapshot -i`
- `fill`
- `click`
- `wait`
- `screenshot`
