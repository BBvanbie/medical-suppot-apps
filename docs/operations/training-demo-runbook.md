# 訓練 / デモ運用手順

## 目的

- `TRAINING` モードを使って、説明会、訓練、PoC デモを安全に実施する。
- 実データと混ぜずに、`EMS -> HOSPITAL -> ADMIN` の流れを見せられるようにする。

## このプロジェクトの TRAINING 運用前提

- ユーザーごとに `LIVE / TRAINING` を切り替える
- `TRAINING` ユーザーは `TRAINING` データだけを表示する
- 通知や集計も `TRAINING` と `LIVE` を混ぜない
- `ADMIN` は `TRAINING` データの一括リセットを実行できる

## 利用開始前

1. 対象ユーザーを `TRAINING` に切り替える
2. 利用する端末を確認する
3. 登録端末と WebAuthn MFA 状態を確認する
4. 参加者へ次を説明する
   - 本番データへ混ざらない
   - 表示も通知も `TRAINING` だけになる
   - 画面上に TRAINING バナーが出る

## 推奨デモ構成

### パターン A: 基本導線

1. `EMS` で事案作成
2. 病院検索
3. `HOSPITAL` へ受入要請送信
4. `HOSPITAL` 側で `要相談` または `受入可能`
5. `EMS` で搬送判断

### パターン B: 管理者説明込み

1. 上記の基本導線
2. `ADMIN` で監視画面を開く
3. `TRAINING` と `LIVE` が混ざらない説明を行う
4. 終了後に一括リセットを見せる

## 実施中の確認

- TRAINING バナーが出ている
- 事案 badge が TRAINING 扱いになっている
- 通知も TRAINING 側だけで増える
- 本番運用画面と見分けがつく

## 設定画面で利用者へ案内する内容

- EMS: `設定 > 運用モード`
  - TRAINING で事案作成、病院検索、送信、搬送判断を本番と混ぜない
- HOSPITAL: `設定 > 運用モード`
  - TRAINING で受入要請、相談、患者一覧を訓練データだけで扱う
- ADMIN: `管理設定 > 運用モード`
  - TRAINING で監視し、終了後に reset する
- DISPATCH: `指令 > 設定 > 運用モード`
  - TRAINING で起票と指令一覧を訓練案件だけに切り替える

## FAQ

### Q. TRAINING 中に本番データは見えますか

- 見えません。現在の mode だけを表示します。本番確認が必要なら `LIVE` に戻します。

### Q. TRAINING データは本番通知や統計に混ざりますか

- 混ざりません。通知、一覧、analytics / KPI は `TRAINING` と `LIVE` を分離します。

### Q. TRAINING の終了後は何を確認しますか

- 対象ユーザーを `LIVE` に戻す
- TRAINING バナーが消えたことを確認する
- 必要なら `ADMIN` が training reset を実行する

### Q. DISPATCH でも TRAINING 案件を作れますか

- 作れます。`DISPATCH` も mode を `TRAINING` に切り替えると、起票案件は TRAINING データとして保存されます。

## 説明時のポイント

- 現場フローに近い画面構成
- `EMS` から見た病院検索と送信
- `HOSPITAL` の受入要請一覧、詳細、相談
- `ADMIN` の監視と統制
- セキュリティ hardening
  - ロック
  - 一時パスワード
  - 端末登録
  - WebAuthn MFA

## 終了後

1. 必要なら `TRAINING` データを一括リセットする
2. 対象ユーザーを `LIVE` に戻す
3. TRAINING バナーが消えていることを確認する
4. 本番端末で TRAINING が残っていないことを確認する

## 運用上の注意

- TRAINING のまま本番運用に入らない
- TRAINING 用の説明資料と本番手順を混ぜない
- 大量デモデータ投入時は終了後のリセットまでセットで考える

## 関連文書

- [system-spec-2026-03-29.md](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md)
- [admin-operations-guide.md](/C:/practice/medical-support-apps/docs/operations/admin-operations-guide.md)
- [proposals/poc-overview.md](/C:/practice/medical-support-apps/docs/proposals/poc-overview.md)
