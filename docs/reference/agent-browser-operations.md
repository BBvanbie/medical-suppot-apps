# agent-browser 運用メモ

## 目的

`agent-browser` を、このリポジトリで AI が実ブラウザ確認を行うための補助手段として使う。
対象はローカル開発中の画面確認、再現、簡易デバッグ、スクリーンショット取得であり、回帰保証の正本は Playwright のままとする。

## 使い分け

- `agent-browser`
  - 開発中の画面確認
  - 実クリック、入力、遷移、モーダル確認
  - UI 崩れ、文言、状態変化の把握
  - バグ再現、現象調査、スクリーンショット取得
- Playwright
  - 継続的な自動回帰テスト
  - CI での安定確認
  - 定型 workflow の再実行

## 前提

1. 依存導入

```bash
npm install
npm run browser:install
```

2. ローカルサーバー

- `localhost` の起動はユーザー側で行う
- AI は未起動時に勝手に `npm run dev` を実行しない
- 基本前提 URL は `http://127.0.0.1:3000`

3. セッション終了

```bash
npm run browser:close
```

## 基本手順

1. ユーザーが `npm run dev` を実行し、`http://localhost:3000` を立ち上げる
2. AI は対象ページを `open` する
3. 最初に `snapshot -i --json` で見えている要素と `ref` を把握する
4. 最新 snapshot で確認できた `ref` を優先して操作する
5. 操作後に `wait`、必要なら再度 `snapshot` して差分を確認する
6. 必要に応じて `screenshot` を保存する

## コマンド例

ログイン画面を開いて状態を把握する:

```bash
npx agent-browser open http://127.0.0.1:3000/login
npx agent-browser wait --load domcontentloaded
npx agent-browser snapshot -i --json
```

snapshot の `ref` を使って入力し、表示切替ボタンを押す:

```bash
npx agent-browser fill @e3 demo
npx agent-browser fill @e4 demo123
npx agent-browser click @e5
npx agent-browser wait 500
```

画面が変わったら snapshot を取り直す:

```bash
npx agent-browser snapshot -i --json
```

スクリーンショットを保存する:

```bash
npx agent-browser screenshot tmp/agent-browser-login.png
```

## 操作方針

- まずページ全体の状態把握を優先する
- ブラウザ操作前に必ず `snapshot -i --json` を取り、最新の `ref` を確認する
- `ref` が確認できない状態では `click` / `fill` を実行しない
- 決め打ち CSS セレクタより `snapshot` / `ref` / `label` / `role` を優先する
- 不安定な場合は `snapshot` を取り直してから進める
- 画面遷移後、モーダル表示後、フォーム送信後は再 snapshot を前提にする
- 長い処理や重いページでは timeout を調整する
- 操作結果は「何を開き、何を操作し、何が起きたか」を短く記録する
- 複雑な定型導線は、最終的に Playwright へ戻して固定化する

## このプロジェクトでの主な確認対象

- 共通
  - 一覧から詳細への遷移
  - 保存、送信、状態更新後の表示変化
  - エラー表示、バリデーション、スクリーンショット
- EMS
  - 事案一覧、詳細、タブ切替、相談モーダル
- HOSPITAL
  - 要請一覧、ステータス更新、受入可否表示の変化
- ADMIN
  - ダッシュボード、一覧導線、監視系画面の drill-down

## 補足

- `agent-browser` 実行時は環境によって sandbox 内ソケット作成が失敗することがある。その場合は権限昇格で実行する
- Windows で `--profile` を使う場合、Chrome 起動中は profile lock に注意する
- `agent-browser` の確認は品質保証の完了条件ではない。重要導線は Playwright でカバーする
