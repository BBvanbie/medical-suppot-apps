# EMS command desk UI redesign design

## 結論

EMS 側 UI は `現場指揮卓型` を正本にする。
通常運用は白ベースの可読性を残しつつ、情報密度、優先導線、即時判断を強める。
TRIAGE 中だけは視覚言語を切り替え、白赤系の緊急運用面として明確に区別する。

## 前提

- 対象端末は iPad 横画面を主前提にする。
- 第 1 弾の対象は EMS home、sidebar / shell、事案一覧、事案詳細、病院検索、EMS統計である。
- `LIVE / TRAINING` のデータ分離と `STANDARD / TRIAGE` の運用表示は分離する。
- 既存の通常運用の病院検索、offline conflict、送信履歴の挙動は維持する。
- 病院側には TRIAGE モードを追加しない。病院側は通常の受入要請として処理し、TRIAGE由来である表示だけを持つ。

## 設計判断

1. EMS は `dashboard` ではなく `command desk` として扱う。
2. 通常運用は白ベースを維持し、背景レイヤーと濃紺 CTA で情報密度を支える。
3. TRIAGE は shell、sidebar、home hero、事案一覧の tone を白赤系に切り替える。
   - 明るい環境下での視認性を優先し、黒基調の面は使わない。
4. 事案一覧は `1 item = 1 command card` を維持し、expanded 時だけ送信先履歴と搬送判断を出す。
5. TRIAGE の事案登録は `初動情報 -> START法/PAT系評価 -> 本部報告/搬送先指示待ち` を主導線にする。
6. TRIAGE の評価面は START法、解剖学的評価、患者ごとの傷病詳細、補助バイタルで構成する。
7. 患者サマリー、OCR、既往歴などは初動登録を妨げないよう後続入力へ退避する。
8. EMS統計とグラフはTRIAGE中に白赤 tone へ切り替えるが、初動判断の主役にはしない。
9. TRIAGE の operational flow は `本部報告 -> START自動判定 -> PAT自動判定 -> 搬送先指示` を正本にする。
10. EMS は病院と直接やり取りせず、病院連絡と搬送先振り分けは dispatch に集約する。
11. 病院側は TRIAGE モードを持たず、dispatch から届いた通常の受入要請として処理する。
12. dispatch は病院検索、TRIAGE受入依頼送信、病院応答確認、EMSへの受入可能病院送信を同じカード内で扱う。
13. 病院がTRIAGE受入依頼を `受入可能` にする場合は、`受入可能人数` を必須入力する。
14. dispatch-managed TRIAGE request では、病院応答はEMSへ直接通知しない。dispatchが選択EMSへ送信した時点でEMS通知と搬送決定可能な target を作る。
15. dispatch は受入可能病院を複数EMSへ送信できる。各EMS事案には dispatch fanout として `ACCEPTABLE` の hospital request target を作り、EMSの既存 `搬送決定` 操作に接続する。

## 非目標

- 病院検索結果の全面再設計
- TRIAGE 専用の別系統DBを新設すること
- HOSPITAL 側に operational mode 切替を追加すること
- EMS 以外の HOSPITAL / ADMIN / DISPATCH 画面刷新

## 検証方針

- `npm run check`
- 可能なら `e2e/tests/ems-triage-mode.spec.ts`
- 可能なら `e2e/tests/navigation-perf.spec.ts --grep "EMS navigation stays responsive"`
