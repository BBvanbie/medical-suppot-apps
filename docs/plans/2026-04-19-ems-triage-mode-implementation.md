# EMS トリアージモード実装計画

最終更新: 2026-04-19

## 目的

- EMS 先行で、ホームから即時に切り替えられる `トリアージモード` を導入する。
- `LIVE / TRAINING` のデータ分離とは独立した EMS UI 運用モードとして実装する。

## 実装順

### Step 1. EMS settings foundation

- `ems_user_settings.operational_mode` を追加
- repository に read / write を追加
- `STANDARD | TRIAGE` の型と label helper を追加

### Step 2. API

- `GET/PATCH /api/settings/ambulance/operational-mode` を追加
- EMS role 以外は拒否

### Step 3. EMS ホーム quick toggle

- hero に segmented control を追加
- 切替は optimistic に見せつつ PATCH で保存
- 成功後は banner / badge / quick links priority を即反映

### Step 4. EMS shell / settings

- `TriageModeBanner` を追加
- EMS settings overview か mode 画面へ正式導線を追加

### Step 5. Focused verification

- EMS ホームで切替できる
- reload 後も保持される
- `TRAINING` と `TRIAGE` が混線しない

## 注意点

- `currentMode` は触らない
- `TRAINING` 中でも `operationalMode=TRIAGE` は取り得るため、UI 表示順は
  1. `TRAINING` banner
  2. `TRIAGE` banner
  の両立を想定する
- 初期段階では triage による通知・集計・データ作成先変更は行わない

## 2026-04-22 実装完了メモ

- 5 サイクルで `設計再確認 -> foundation -> home/settings -> shell/case -> focused E2E` を回した
- Cycle 1:
  - `scripts/migration_20260422_0017_ems_operational_mode.sql` を追加し、`ems_user_settings.operational_mode` と check constraint を導入した
  - `lib/emsSettingsSchema.ts`、`lib/emsSettingsRepository.ts`、`lib/emsSettingsValidation.ts` を拡張し、`STANDARD | TRIAGE` を repository 正本にした
- Cycle 2:
  - `app/api/settings/ambulance/operational-mode/route.ts` を追加し、EMS 限定の GET / PATCH を実装した
  - offline settings sync に `operationalMode` を追加した
- Cycle 3:
  - `components/home/HomeDashboard.tsx` に home quick toggle、optimistic save、TRIAGE badge、priority links 切替を追加した
  - `components/shared/TriageModeBanner.tsx` と `components/ems/EmsPortalShell.tsx` で shell banner を導入した
  - `components/home/Sidebar.tsx` に TRIAGE short badge を追加した
- Cycle 4:
  - `app/settings/mode/page.tsx` に `EmsOperationalModeForm` を追加し、正式設定導線を mode 画面へ統合した
  - `app/settings/page.tsx` の mode summary を `LIVE / TRAINING` と `STANDARD / TRIAGE` の併記へ更新した
  - `app/cases/search/page.tsx`、`components/cases/CaseSearchPageContent.tsx`、`app/cases/new/page.tsx`、`app/cases/[caseId]/page.tsx`、`components/cases/CaseFormPage.tsx` を更新し、triage 中の一覧 / フォーム表示を追加した
  - `app/paramedics/stats/page.tsx` は triage 中の統計を補助情報扱いに寄せた
- Cycle 5:
  - `npm run check`、`npm run db:migrate`、`npm run db:verify` を通過した
  - `e2e/tests/ems-triage-mode.spec.ts` を追加し、home toggle、reload 保持、case form note、`TRAINING + TRIAGE` 共存を確認した
  - focused 実行は `2 passed` を確認した
- 2026-04-22 follow-up:
  - `components/cases/CaseFormPage.tsx` は triage 中の `病院選定へ` を `緊急選定へ` に切り替え、病院検索へ進む段階では `12歳未満の体重` と `75歳以上の ADL` 未入力で停止しないようにした
  - `app/hospitals/search/page.tsx` と `components/hospitals/HospitalSearchPage.tsx` は EMS の `operationalMode` を受け取り、triage 中は赤基調の別 UI へ切り替えるようにした
  - `components/hospitals/SearchConditionsTab.tsx` は triage 専用 `FAST LANE` を追加し、診療科未選択でも `直近検索 / 市区名検索` を実行できるようにした
  - `app/api/hospitals/recent-search/route.ts` は `triage=true` または `operationalMode=TRIAGE` を受けた場合、`recent / municipality` 検索で診療科ゼロ件を許可するようにした
  - `components/hospitals/SearchResultsTab.tsx` は triage 中の候補比較カードと選択状態を赤アクセントへ寄せた
  - `e2e/tests/ems-triage-mode.spec.ts` に `EMS triage case flow can move to hospital search with minimum inputs` を追加し、最小入力で case form から hospital search に遷移できること、および triage 付き無科目検索 API が通ることを確認した
  - checks:
    - `npm run check`
    - `npx playwright test e2e/tests/ems-triage-mode.spec.ts --reporter=line`

## 2026-04-27 dispatch 集約フローのレビュー補修

- 5 周の `修正 -> 再評価` で、dispatch 集約型の TRIAGE 病院選定フローを補修した。
- Cycle 1:
  - dispatch fanout で作る `hospital_requests.patient_summary` を、dispatch側の flags だけではなく対象EMS事案の `case_payload` 由来患者サマリーへ変更した。
  - START/PAT、傷病詳細、主訴など、病院が搬送決定後に確認すべき臨床情報を fanout 先にも保持する。
- Cycle 2:
  - 受入可能人数を超える複数EMS送信を UI と API で拒否するようにした。
  - 手入力の搬送先送信は、EMS側の搬送決定 target に接続しないためTRIAGE dispatchフローから外した。
  - EMS送信履歴では PostgreSQL の id が文字列で返る場合も考慮し、dispatch assignment target 判定を数値正規化した。
- Cycle 3:
  - `POST /api/dispatch/cases/[caseId]/hospital-requests` はTRIAGE本部報告だけを対象に制限した。
  - assignment 更新、fanout target 作成、通知作成を同一 transaction にまとめ、source target 単位の advisory lock を追加した。
  - 病院の相談モーダル内での `受入可能` にも、TRIAGE時の `受入可能人数` 入力と検証を追加した。
- Cycle 4:
  - 複数EMS選択を同一現場住所で絞り、住所未設定時は当該事案だけを選択対象にした。
  - API側でも住所未設定の別事案への複数EMS送信を拒否する。
- Cycle 5:
  - `e2e/tests/ems-triage-mode.spec.ts` に、EMS報告 -> dispatch病院依頼 -> 病院受入可能人数返答 -> dispatchからEMSへ送信 -> EMS搬送決定 -> 病院搬送決定通知、の回帰を追加した。
  - 確認済み:
    - `npm run check`
    - `npm run db:verify`
    - `npx.cmd playwright test e2e/tests/ems-triage-mode.spec.ts --grep "EMS triage case flow" --reporter=line`
    - `npx.cmd playwright test e2e/tests/ems-triage-mode.spec.ts --reporter=line`

## 2026-04-27 追加リスク補修

- target 再利用:
  - 同一事案では病院が受入可能を返した元 target を assignment target として使う。
  - 別EMS事案への送信時だけ dispatch fanout target を作る。
  - 既存fanout targetの再利用は `triageDispatchManaged=true` かつ `dispatchFanoutSourceTargetId` 一致、かつ `ACCEPTABLE` のものに限定する。
- bulk assignment:
  - dispatch UI は複数EMS送信時に複数PATCHを投げず、1回の assignment API に `targetCaseIds` を渡す。
  - assignment API は対象case群を同一 transaction 内で検証・更新し、容量超過や同一現場不一致があれば全体をrollbackする。
- 境界条件:
  - 同一現場判定は住所に加えて覚知日も照合する。
  - 同一case / 同一hospitalの未完了TRIAGE受入依頼は重複作成しない。
  - `accepted_capacity` はDB制約でも `NULL または 1以上` に統一した。
- migration:
  - `scripts/migration_20260427_0019_triage_capacity_constraint.sql`
- negative E2E:
  - 通常事案へのTRIAGE受入依頼拒否
  - TRIAGE受入可能時の受入可能人数未入力拒否
  - 受入可能人数超過時の複数EMS assignment rollback
- checks:
  - `npm run db:migrate`
  - `npm run check`
  - `npm run db:verify`
  - `npx.cmd playwright test e2e/tests/ems-triage-mode.spec.ts --reporter=line`
