# EMS 患者情報 OCR 保険証拡張 実装計画

最終更新: 2026-04-22

## 目的

- EMS 患者情報 OCR の対応書類に `健康保険証` と `資格確認書` を追加する。
- 既存と同じく `氏名 / 住所 / 生年月日` だけを候補返却し、保険情報は保持しない。

## 実装順

### Step 1. UI / API の許可種別追加

- `PatientIdentityOcrPanel` に書類種別を追加する
- `POST /api/ems/patient-identity-ocr` の許可種別を更新する

### Step 2. Python 抽出追加

- `insurance_card` と `eligibility_certificate` の抽出分岐を追加する
- 氏名 / 住所 / 生年月日の label-based 抽出を追加する
- 住所欄に混じる保険情報を除去する

### Step 3. Docs / verification

- `docs/current-work.md` に拡張内容を反映する
- mock text と `npm run check` で確認する

## 実装結果

- `健康保険証` と `資格確認書` を UI の書類種別へ追加した
- API の許可種別に `insurance_card` と `eligibility_certificate` を追加した
- Python OCR に保険証系共通抽出を追加し、`氏名 / 住所 / 生年月日` だけを返すようにした
- 協会けんぽ公開 PDF の見本をもとに、`健康保険資格確認書` 系のラベル差分を stop word / name label / address label に反映した
- `scripts/ocr/test_patient_identity_ocr.py` を追加し、免許証 / マイナンバーカード / 健康保険証 / 資格確認書の抽出回帰を固定した
- `氏 名 / 住 所 / 生 年 月 日 / 被 保険 者 氏名` のような分割ラベルを吸収するため、label 判定と prefix 除去を空白ゆらぎ対応にした

## 検証

- `python -m unittest scripts.ocr.test_patient_identity_ocr -v`
- `python scripts/ocr/patient_identity_ocr.py --document-type insurance_card --mock-text ...`
- `python scripts/ocr/patient_identity_ocr.py --document-type eligibility_certificate --mock-text ...`
- `npm run check`

## 注意点

- 保険証系は券面差分が大きいため、初期版は保険情報の詳細抽出をしない
- 住所欄が存在しない券面では `address=null` を許容する
