# agent-browser 導入実装

## 目的

AI が本リポジトリのローカルアプリを実ブラウザで確認できるようにし、UI 実装後の exploratory verification 精度を上げる。

## 変更内容

1. `agent-browser` を devDependency に追加
2. `package.json` に install / close 用 script を追加
3. `README.md` に導入手順と browser verification の位置づけを追加
4. `AGENTS.md` に durable な browser verification ルールを追加
5. `docs/reference/agent-browser-operations.md` を追加し、手順とコマンド例を記録
6. repo-local `skills/test-check` と `skills/e2e-testing` に `agent-browser` との役割分担を追記

## 実装メモ

- `localhost` 起動はユーザー側運用とした
- AI は未起動時にブラウザ確認を進めず、起動依頼を返す
- `agent-browser` は exploratory 用であり、Playwright の代替にはしない
- 実行環境によっては sandbox 内でソケット作成に失敗するため、必要時は権限昇格で実行する

## 実機確認

ローカル `http://127.0.0.1:3000/login` に対して以下を確認した。

- `open`
- `wait --load domcontentloaded`
- `get title`
- `snapshot -i`
- `find label "ユーザー名" fill demo`
- `find label "パスワード" fill demo123`
- `find role button click --name "パスワードを表示"`
- `wait 500`
- `screenshot`

取得物:

- `tmp/agent-browser-login.png`
- `tmp/agent-browser-login-filled.png`

## 確認結果

- ログイン画面のタイトル取得に成功
- interactive snapshot で入力欄とボタン参照を取得できた
- ラベル基準の入力とボタン押下が成功
- スクリーンショット保存が成功

## 残件

- 定型導線の品質保証は引き続き Playwright 側で追加する
- 役割別の代表画面に対する browser verification の運用は、今後の UI 実装時に都度適用する
