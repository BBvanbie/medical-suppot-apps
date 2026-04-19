# EMS 患者情報 OCR 設計

最終更新: 2026-04-19

## 結論

- EMS 事案フォームの患者基本情報に、`本人確認書類を読み取る` 導線を追加する。
- 初期対応書類は `運転免許証` のみとし、対象項目は `氏名 / 住所 / 生年月日` に絞る。
- OCR 実行は `Next.js API -> Python スクリプト直接実行` で行い、Python 側は `PaddleOCR` を前提にする。
- 画像は永続保存しない。撮影または画像選択で取得した画像は OCR 完了後に破棄し、抽出候補のみを UI に返す。

## 前提と制約

- EMS UI は iPad 横固定前提で、フォーム内で完結する短い導線が必要。
- 氏名は単一 input、住所も単一 input、生年月日は `西暦 / 和暦` 切替と `年 / 月 / 日` の分割 input で構成されている。
- 誤認識をそのまま反映すると医療安全上の事故になり得るため、OCR は候補生成までに留める。
- 初期段階では速度よりも運用の安定性と確認可能性を優先し、`運転免許証` 専用ルールで始める。
- Python 実行環境は存在するが、`paddleocr` / `opencv` / `numpy` は現時点では未導入である。

## 方式比較

### 1. 外部 OCR API

- 長所: 初期精度を出しやすい。
- 短所: 個人情報の外部送信が必要で、今回の方針から外れる。
- 判断: 不採用。

### 2. Next.js API から Python スクリプトを直接実行

- 長所: 初期実装が最も小さい。UI と API を既存 Next.js に寄せやすい。
- 長所: 将来ローカルサービス化する場合も、Python 抽出ロジックを流用しやすい。
- 短所: 同時実行や依存解決は app 側で面倒を見る必要がある。
- 判断: 採用。

### 3. Next.js API -> Python HTTP サービス

- 長所: 将来の分離運用に向く。
- 短所: 初期構築が重い。
- 判断: 初期版では不採用。

## 推奨設計

### 1. UI フロー

1. 患者基本情報 card に `本人確認書類を読み取る` ボタンを追加する。
2. ボタン押下で `運転免許証` を選択し、カメラまたは画像選択を起動する。
3. 撮影後にプレビューを表示し、`OK` で OCR を実行する。
4. OCR 結果は患者基本情報 card 内でインライン表示する。
5. `氏名 / 住所 / 生年月日` ごとにチェックボックスを表示し、チェックされた項目だけをフォームへ反映する。
6. 失敗時は `撮り直す` または `このまま手入力する` を選べるようにする。

### 2. API

- 追加 route:
  - `POST /api/ems/patient-identity-ocr`
- 認可:
  - EMS role のみ許可
- 入力:
  - `documentType`
  - `image`
- バリデーション:
  - 初期対応は `drivers_license` のみ
  - MIME は `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif` を許可し、サイズは上限を設ける
- 出力:
  - `documentType`
  - `fields.name`
  - `fields.address`
  - `fields.birth`
  - `warnings`
  - `ok`

### 3. Python OCR スクリプト

- 配置:
  - `scripts/ocr/patient_identity_ocr.py`
- 入力:
  - 一時画像ファイル path
  - `documentType`
- 出力:
  - JSON 固定
- 処理:
  - 画像前処理
  - PaddleOCR 実行
  - OCR text line を収集
  - 運転免許証向けルールで `氏名 / 住所 / 生年月日` を抽出
  - 生年月日は元号を西暦へ正規化し、`year / month / day` へ分解

### 4. 抽出ルール

- 初期版は `運転免許証` 専用にする。
- 基本は OCR line 群からの label-based 抽出とし、以下を含む:
  - `住所` の複数行結合
  - `交付` や `有効` と `生年月日` の取り違え回避
  - `氏名` の周辺語除去
  - 元号 `昭和 / 平成 / 令和` の西暦変換
- `rawText` は UI 返却しない。デバッグ情報も既定では返さない。

### 5. 依存と運用

- Python 依存は別ファイルに固定する。
  - `scripts/ocr/requirements.txt`
- 初期版は OCR 依存未導入時に fail fast で明示的エラーを返す。
- PII を含む画像や OCR 生文字列は保存しない。

## 非目標

- 保険証、資格確認書、マイナンバーカードへの即時対応
- 外部 OCR API との併用
- サーバー外保存や監査用 raw OCR ログ
- 完全自動反映
- 氏名以外の追加属性抽出

## 影響ファイル

- `components/cases/CaseFormBasicTab.tsx`
- `components/cases/CaseFormPage.tsx`
- `app/api/ems/patient-identity-ocr/route.ts`
- `scripts/ocr/patient_identity_ocr.py`
- `scripts/ocr/requirements.txt`
- `docs/current-work.md`
- `docs/plans/2026-04-19-ems-patient-ocr-implementation.md`

## 検証方針

- `npm run check`
- OCR 依存が未導入でも route / UI が壊れないことを確認する
- Python スクリプトは mock text を使って抽出ルールの smoke check を行う
- 必要なら focused Playwright を後続で追加する
