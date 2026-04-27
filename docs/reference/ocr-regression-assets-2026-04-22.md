# OCR 評価資産固定メモ 2026-04-22

## 目的

- EMS 患者情報 OCR の合成評価資産を固定し、次回以降の精度確認で同じ入力セットと同じ基準結果を参照できるようにする。
- `tmp/ocr-sample-images/` を一時生成物ではなく、2026-04-22 時点の回帰評価ベースラインとして扱う。

## 変更内容

- 固定対象ディレクトリは次の 4 セットとする。
  - `tmp/ocr-sample-images/2026-04-22-set-01`
  - `tmp/ocr-sample-images/2026-04-22-set-02-photo-like`
  - `tmp/ocr-sample-images/2026-04-22-set-03-photo-like-40`
  - `tmp/ocr-sample-images/2026-04-22-set-04-photo-like-100`
- 各セットは `manifest.json` を正本とし、画像ファイル名、書類種別、バリエーション、正解値の対応をそこに保持する。
- 固定する最終評価結果は次の `results.json` とする。
  - `set-01`: `tmp/ocr-sample-images/2026-04-22-set-01/ocr-eval-final-2/results.json`
  - `set-02-photo-like`: `tmp/ocr-sample-images/2026-04-22-set-02-photo-like/ocr-eval-tuned-2/results.json`
  - `set-03-photo-like-40`: `tmp/ocr-sample-images/2026-04-22-set-03-photo-like-40/ocr-eval-tuned/results.json`
  - `set-04-photo-like-100`: `tmp/ocr-sample-images/2026-04-22-set-04-photo-like-100/ocr-eval-tuned/results.json`
- EMS UI 実投入の正本結果は次の `results.json` とする。
  - `set-01`: `tmp/ocr-sample-images/2026-04-22-set-01/ems-ui-eval/results.json`
  - `set-02-photo-like`: `tmp/ocr-sample-images/2026-04-22-set-02-photo-like/ems-ui-eval/results.json`
  - `set-03-photo-like-40`: `tmp/ocr-sample-images/2026-04-22-set-03-photo-like-40/ems-ui-eval/results.json`
  - `set-04-photo-like-100`: `tmp/ocr-sample-images/2026-04-22-set-04-photo-like-100/ems-ui-eval/results.json`

## 運用方法

- セット概要
  - `set-01`: 4書類 x 5バリエーションの基礎 20件。`plain / spaced / mixed / noisy / angled`
  - `set-02-photo-like`: 4書類 x 5バリエーションの実画像寄り 20件。`desk_shadow / warm_light / cool_tilt / phone_capture / edge_shadow`
  - `set-03-photo-like-40`: 4書類 x 5バリエーション x 各2件の 40件
  - `set-04-photo-like-100`: 4書類 x 5バリエーション x 各5件の 100件
- 2026-04-22 時点の固定結果
  - CLI 基準
  - `set-01`: `20/20 full match`
  - `set-02-photo-like`: `17/20 full match`
  - `set-03-photo-like-40`: `40/40 full match`
  - `set-04-photo-like-100`: `100/100 full match`
  - EMS UI 実投入基準
  - `set-01`: `20/20 full match`
  - `set-02-photo-like`: `20/20 full match`
  - `set-03-photo-like-40`: `40/40 full match`
  - `set-04-photo-like-100`: `100/100 full match`
- 固定結果を確認するときは各 `results.json` の `summary` を参照する。
- CLI は OCR スクリプト単体の抽出基準、EMS UI 実投入は `/cases/new` の OCR パネルから `反映する` までを含む運用基準として扱う。
- OCR 実装変更後は既存セットを上書きせず、新しい評価結果ディレクトリを同一セット配下に追加する。
  - 例: `ocr-eval-2026-04-23`、`ocr-eval-tuned-3`
- 生成からやり直す場合の基準コマンド

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
& .\.venv-ocr\Scripts\Activate.ps1
python scripts/ocr/patient_identity_ocr_cycle.py --rounds 1 --cases-per-document 10 --output-root tmp/ocr-cycle-runs
```

- 単体テストと型整合の確認コマンド

```powershell
python -m unittest scripts.ocr.test_patient_identity_ocr -v
npm run typecheck
```

- EMS UI 実投入確認
  - `localhost:3000` が起動済みの状態で `e2e_ems_a` を使い、`/cases/new` の OCR パネルから対象セットを投入する。
  - 2026-04-22 実績では `set-01` 20件、`set-02-photo-like` 20件、`set-03-photo-like-40` 40件、`set-04-photo-like-100` 100件を投入し、全件一致を確認した。

## 注意点

- `patient_identity_ocr_cycle.py` は OCR 子プロセスに `.venv-ocr\Scripts\python.exe` を優先使用する。通常の `python` で回すと依存不足や timeout 判定の差が出る可能性がある。
- `set-02-photo-like` は CLI では `17/20`、EMS UI 実投入では `20/20` である。今後差分が出た場合は、スクリプト単体の抽出挙動と UI 経由の実運用挙動を分けて判断する。
- `set-03` と `set-04` は 2026-04-22 時点の最終到達点として扱う。次回以降に精度が落ちた場合は regression と判断する。
- `tmp` 全体を掃除するときは `tmp/ocr-sample-images/` 配下を削除対象に含めない。ここは OCR 回帰資産として保持する。
