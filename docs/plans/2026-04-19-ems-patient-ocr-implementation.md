# EMS 患者情報 OCR 実装計画

最終更新: 2026-04-19

## 目的

- EMS 事案フォームに、運転免許証から `氏名 / 住所 / 生年月日` を読み取り、確認後に反映できる患者情報 OCR を追加する。

## 実装順

### Step 1. Docs / scope 固定

- design / implementation plan を作成する
- `docs/current-work.md` に新テーマを追加する

### Step 2. Python OCR foundation

- `scripts/ocr/patient_identity_ocr.py` を追加する
- `PaddleOCR` 未導入時の明示エラーを入れる
- `運転免許証` の mock text / OCR line から抽出できる純粋関数を入れる

### Step 3. Next.js API

- `POST /api/ems/patient-identity-ocr` を追加する
- EMS role 認可、画像種別とサイズの検証、一時ファイル生成と削除を実装する
- Python スクリプト実行結果を UI 用 JSON に整形する

### Step 4. EMS フォーム UI

- 患者基本情報 card に `本人確認書類を読み取る` 導線を追加する
- プレビュー、OCR 実行中、抽出結果、チェック反映、失敗時 CTA をインラインで実装する
- 生年月日反映時は既存フォームに合わせて `年 / 月 / 日` に分解して反映する

### Step 5. Harden / verification

- 画像未選択、OCR 失敗、部分成功、取り消し、再撮影を確認する
- `npm run check` を通す
- Python 依存未導入環境でのエラーメッセージを確認する

## ループメモ

1. 最小構成の API / UI を入れる
2. 抽出ルールの欠けを補う
3. エラー / 失敗導線を詰める
4. UI 密度と既存フォーム統合を整える
5. docs / verification を仕上げる

## 注意点

- 画像は保存しない
- raw OCR text は保存しない
- 成功時でも自動反映しない
- 初期版は `運転免許証` 以外を受け付けない

## 実装結果

- `scripts/ocr/patient_identity_ocr.py` を追加し、`運転免許証` の `氏名 / 住所 / 生年月日` を抽出する JSON 固定返却を実装した
- `scripts/ocr/requirements.txt` を追加し、`paddleocr` と `opencv-python-headless` の依存を分離した
- `POST /api/ems/patient-identity-ocr` を追加し、EMS role 認可、画像種別・サイズ検証、一時ファイル生成と削除、Python 実行を実装した
- `components/cases/PatientIdentityOcrPanel.tsx` を追加し、撮影 / 画像選択、プレビュー、OCR 実行、候補確認、チェック反映、失敗時の `撮り直す / 手入力する` 導線を実装した
- `CaseFormBasicTab` と `CaseFormPage` を更新し、OCR 結果を既存の `氏名 / 住所 / 生年月日` フィールドへ反映できるようにした
- Python 依存未導入時は、Python スクリプトが構造化エラー JSON を返し、API は 422 として UI へ返す
- 2026-04-19 追記:
  - UI は `書類種別を選ぶ` 方式へ変更し、`運転免許証 / マイナンバーカード` を選択できるようにした
  - `my_number_card` を API / Python OCR の許可種別へ追加した
  - `マイナンバーカード表面` は `氏名 / 住所 / 生年月日` のみを返し、住所は 1 行連結、生年月日は西暦として扱う

## 検証

- `npm run typecheck`
- `npm run lint`
- `npm run check`
- `npm run check:full`
- `python scripts/ocr/patient_identity_ocr.py --document-type drivers_license --mock-text-file ...`
- `python scripts/ocr/patient_identity_ocr.py --document-type drivers_license --mock-text ...`
- `python scripts/ocr/patient_identity_ocr.py --document-type my_number_card --mock-text ...`

## 残件

- localhost 上で `npm run dev` を再起動せずに古い OCR 実行経路を掴んでいると、修正前の `Unknown exception` を踏む可能性がある
- 実画像 1 枚 (`IMG_3945.jpg`) では期待レスポンスを返せるが、住所の建物名補正はまだ局所ルールに依存している
- 次のループでは `運転免許証の実画像` を追加し、住所建物名と行分割の誤読パターンを増やして正規化を汎化する

## 2026-04-19 追加メモ

- ローカル OCR 用に `.venv-ocr` を作成し、以下を導入した
  - `paddleocr 3.4.1`
  - `paddlepaddle 3.2.2`
  - `opencv-python-headless 4.13.0.92`
  - `numpy 2.4.4`
- `app/api/ems/patient-identity-ocr/route.ts` は `.venv-ocr\\Scripts\\python.exe` があればそれを優先して使う
- 実画像テスト用に `tmp/ocr-test/` へ公式 PDF から切り出した免許証見本を置き、Python スクリプトが実画像入力まで到達することを確認した
- Windows CPU で `PP-OCRv5_server_det / rec` は高解像度画像で不安定だったため、初期版は `PP-OCRv5_mobile_det / PP-OCRv5_mobile_rec` と `text_det_limit_side_len=1536` に寄せた
- ただし、公式紹介 PDF のページ全体や切り出し画像は説明文ノイズが多く、現在の抽出ルールでは `氏名 / 住所 / 生年月日` を安定抽出できないケースが残る
- 次の精度ループでは、実際の免許証写真に近い単体画像を使って抽出ルールを調整する
- repo 直下の `IMG_3945.jpg` を使った実画像ループでは、`ocr.ocr(processed)` が `RuntimeError: Unknown exception` を返したため、前処理画像を一時 PNG に保存して `ocr.predict(temp_png)` で読む構成へ切り替えた
- 実画像ループ中に `crop_document_card()` と `MAX_IMAGE_SIDE = 1800` の事前縮小を入れ、背景込み写真でも OCR が完走するようにした
- `IMG_3945.jpg` に対しては、現在以下の JSON を返せる

```json
{
  "documentType": "drivers_license",
  "fields": {
    "name": "馬場口 直人",
    "address": "東京都立川市羽衣町1-5-11 エミ・アミティI立川羽衣102",
    "birth": {
      "westernYear": "1999",
      "month": "03",
      "day": "29"
    }
  },
  "warnings": [],
  "ok": true
}
```

- `IMG_3946.jpg` に対しては、`my_number_card` で現在以下の JSON を返せる

```json
{
  "documentType": "my_number_card",
  "fields": {
    "name": "馬場口 直人",
    "address": "東京都三鷹市下連雀4丁目15番28号 下連雀寮",
    "birth": {
      "westernYear": "1999",
      "month": "03",
      "day": "29"
    }
  },
  "warnings": [],
  "ok": true
}
```

- `localhost:3000` の OCR UI から `マイナンバーカード -> IMG_3946.jpg -> OK で読み取る` を実行し、`status: 200` と上記値の表示を確認した
