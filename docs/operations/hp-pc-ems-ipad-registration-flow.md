# HP PC / EMS iPad 登録手順

## 目的

この文書は、`HOSPITAL` を PC、`EMS` を iPad で使い始めるときの登録順を説明する。
現在の認証方針では、`HOSPITAL` はログアウト後のログインで `WebAuthn MFA` が必須である。`EMS` は現行方針では MFA 対象外で、端末登録のみ必須である。

## 重要な考え方

- `ID / パスワード`: 最初の本人確認
- `WebAuthn MFA`: iPad や PC の生体認証、端末 PIN、パスキーなどを使う追加本人確認
- `端末登録コード`: この iPad / PC を正式端末として登録するための 1 回限りのコード
- `PIN`: 現段階ではログイン導線に使わない

つまり、今後の完了条件は `PIN 設定済み` ではなく、以下の 2 つである。

- `WebAuthn MFA: 登録済み`
- `登録済み端末`

## 事前準備

### PC 側でローカルサーバーを立てる場合

iPad から PC のローカルサーバーを見る場合は、PC 側で次のように起動する。

```powershell
npx next dev --hostname 0.0.0.0 --port 3000
```

iPad では次の形式で開く。

```text
http://PCのIPアドレス:3000/login
```

例:

```text
http://192.168.11.14:3000/login
```

注意:

- iPad と PC は同じ Wi-Fi に接続する
- WebAuthn は origin に依存するため、登録時と認証時は同じ URL で使う
- `localhost` で登録した credential は、別の IP URL では同じ origin として扱われない

## EMS iPad 登録手順

### 1. ADMIN が EMS 端末コードを発行する

1. `ADMIN` でログインする
2. `端末管理` を開く
3. EMS 用端末を選ぶ
4. 端末ロールを `EMS` にする
5. 救急隊所属を対象の隊にする
6. 保存する
7. `登録コード発行` を押す
8. 表示された登録コードを控える

### 2. iPad で EMS ログインする

1. iPad でログイン画面を開く
2. EMS の `ID / パスワード` を入力する
3. MFA 未登録なら `/mfa/setup` に進む
4. 画面の案内に従い、iPad の WebAuthn MFA を登録する

WebAuthn MFA の例:

- Face ID
- Touch ID
- iPad の端末 PIN
- パスキー

### 3. iPad を正式端末として登録する

1. MFA 完了後、端末登録が必要なら `/register-device` に進む
2. ADMIN から受け取った登録コードを入力する
3. `端末を登録` を押す
4. 登録完了後はいったんログイン画面へ戻る

### 4. 再ログインして確認する

1. EMS の `ID / パスワード` で再ログインする
2. `/mfa/verify` が出たら WebAuthn MFA を通過する
3. EMS ホームが開くことを確認する
4. `設定 > 端末情報` を開く
5. `登録済み端末` と `WebAuthn MFA: 登録済み` を確認する

## HOSPITAL PC 登録手順

### 1. ADMIN が病院 PC 端末コードを発行する

1. `ADMIN` でログインする
2. `端末管理` を開く
3. 病院 PC 用端末を選ぶ
4. 端末ロールを `HOSPITAL` にする
5. 病院所属を対象病院にする
6. 保存する
7. `登録コード発行` を押す
8. 表示された登録コードを控える

### 2. PC で HOSPITAL ログインする

1. PC のブラウザでログイン画面を開く
2. 病院ユーザーの `ID / パスワード` を入力する
3. MFA 未登録なら `/mfa/setup` に進む
4. 画面の案内に従い、PC の WebAuthn MFA を登録する

WebAuthn MFA の例:

- Windows Hello
- macOS Touch ID
- ブラウザの passkey
- セキュリティキー

### 3. PC を正式端末として登録する

1. MFA 完了後、端末登録が必要なら `/register-device` に進む
2. ADMIN から受け取った登録コードを入力する
3. `端末を登録` を押す
4. 登録完了後はいったんログイン画面へ戻る

### 4. 再ログインして確認する

1. 病院ユーザーの `ID / パスワード` で再ログインする
2. `/mfa/verify` が出たら WebAuthn MFA を通過する
3. `受入要請一覧` が開くことを確認する
4. `設定 > 端末情報` を開く
5. `登録済み端末` と `WebAuthn MFA: 登録済み` を確認する

## うまくいかない場合

### `/mfa/setup` が出る

MFA が未登録である。画面に従って WebAuthn MFA を登録する。

### `/mfa/verify` が出る

MFA は登録済みで、ログイン時の追加本人確認が必要である。

### `/register-device` が出る

その iPad / PC は正式端末として未登録である。ADMIN が発行した登録コードを入力する。

### 登録コード入力欄が出ない

次の可能性がある。

- 端末登録がまだ必須化されていない
- ADMIN 側で端末ロールや所属が間違っている
- すでに登録済み端末として扱われている

### MFA が失敗する

次を確認する。

- 登録時と認証時で同じ URL を使っているか
- iPad / PC の生体認証や端末 PIN が有効か
- ブラウザが WebAuthn / passkey に対応しているか
- ローカル検証で `localhost` と `PCのIP` を混在させていないか

## 完了チェックリスト

EMS iPad:

- EMS の ID / パスワードでログインできる
- WebAuthn MFA を登録できる
- ADMIN 発行の登録コードで端末登録できる
- 再ログイン時に WebAuthn MFA が求められる
- `設定 > 端末情報` で `登録済み端末` と `WebAuthn MFA: 登録済み` が見える

HOSPITAL PC:

- 病院ユーザーの ID / パスワードでログインできる
- WebAuthn MFA を登録できる
- ADMIN 発行の登録コードで端末登録できる
- 再ログイン時に WebAuthn MFA が求められる
- `設定 > 端末情報` で `登録済み端末` と `WebAuthn MFA: 登録済み` が見える
