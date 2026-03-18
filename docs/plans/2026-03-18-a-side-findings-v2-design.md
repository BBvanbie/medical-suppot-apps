# A側所見入力 v2 設計

## 結論

- A側所見入力は `A_side_findings_definition_v1_2.md` を正とし、所見データを新構造へ移行する。
- 保存形式は新構造へ切り替える。
- 既存ケースの旧 `findings` は読取時のみ新構造へ正規化し、後方互換を維持する。
- 実装は一括置換ではなく、`データモデル -> 正規化層 -> UI土台 -> セクション実装 -> サマリー/保存` の順で分割する。
- 文字化けは通常不具合より優先し、発生時は当該ファイルの復旧を最優先で行う。

## 前提と制約

- 対象は EMS 側のケース入力画面で、中心ファイルは [components/cases/CaseFormPage.tsx](/C:/practice/medical-support-apps/components/cases/CaseFormPage.tsx)。
- 既存所見 UI は旧構成で、`boolean` と自由入力中心の状態管理が混在している。
- 新仕様では中項目と有無型詳細項目を `未操作 / ＋ / ー / 確認困難` の enum で管理する必要がある。
- 既存ケース payload には旧 `findings` が含まれる可能性があるため、既存閲覧・再編集を壊さない必要がある。
- オフライン保存、サマリー表示、ケース保存 payload は現行機能として維持する必要がある。
- 日本語ラベルが多く、PowerShell 表示で文字化けしてもファイル自体は UTF-8 を維持する必要がある。

## 方式比較

### 案1: 旧データ構造を維持して UI のみ差し替える

- 利点: 変更点を見かけ上は減らせる。
- 欠点: 新仕様の 4 状態管理を正しく表現できない。
- 欠点: 未操作と陰性の分離、詳細クリア、確認困難の扱いが一貫しない。
- 判断: 不採用。仕様の中核と矛盾する。

### 案2: 新データ構造へ全面切替し、旧読込互換を持たない

- 利点: 実装は最も単純。
- 欠点: 既存ケース編集時に旧所見が欠落しうる。
- 判断: 不採用。運用リスクが高い。

### 案3: 新データ構造へ切替し、旧データは読取互換のみ残す

- 利点: 新仕様を正しく実装できる。
- 利点: 新規保存後の保守性が高い。
- 利点: 既存ケースの閲覧・再編集を段階移行できる。
- 欠点: 初期化時の正規化層が必要。
- 判断: 採用。

## 推奨設計

### 1. データモデル

- 新たに所見専用の型定義を `lib/` へ追加する。
- 中項目状態は `FindingState = "unselected" | "positive" | "negative" | "unable"` とする。
- 有無型詳細も同じ enum を使う。
- 属性型詳細は `select`、`number`、`time`、`text` を個別フィールドで保持する。
- 時刻系は仕様上 3 パターンを許容するため、厳格な `time` 単体ではなく文字列ベースで保持する。

### 2. 構成定義

- 資料 v1.2 の大項目・中項目・詳細項目をコード化した config を持つ。
- config は表示順、ラベル、入力種別、サマリー対象、初期値を含む。
- UI と保存 payload の両方が同一 config を参照する形にする。

### 3. 正規化層

- 読込時に `casePayload.findings` を検査し、新構造か旧構造かを判定する。
- 旧構造なら新構造へ変換する。
- 変換不能な項目は未操作へフォールバックする。
- 旧構造の逆変換は作らない。保存は常に新構造とする。

### 4. 画面構成

- `CaseFormPage.tsx` から所見 state の大量な `useState` を段階的に除去する。
- 所見 state は単一オブジェクトで保持し、更新 helper を通して変更する。
- セクション UI は専用コンポーネントへ切り出す。
- 表示構成は以下で統一する。
  - FindingsPage
  - FindingsSection
  - SymptomCard
  - DetailField 系
  - SummaryLine

### 5. 状態遷移ルール

- 中項目が `positive` のときだけ詳細を展開する。
- `positive -> negative` または `positive -> unable` へ変化したときは詳細値を即時クリアする。
- 未操作は summary 非表示にする。
- `negative` と `unable` は summary 表示対象とする。

### 6. サマリー

- 既存の changed summary は旧実装に強く依存しているため新構造で作り直す。
- summary は中項目ごとに 1 行を基本とし、資料 v1.2 の表現ルールへ寄せる。
- `＋` は赤系、`ー` は青系、`確認困難` はグレーで表示する。
- NRS 色分けは仕様どおり `1-3 / 4-7 / 8-10` に分ける。

### 7. 保存と互換

- `buildCasePayload()` の `findings` は新構造へ変更する。
- `changedFindings` も新構造の summary 生成結果を利用する。
- 既存データは読込時だけ旧 -> 新へ正規化し、保存時に新形式へ揃える。

### 8. 文字化け対策

- 日本語を含む docs / components / lib を編集する際は UTF-8 前提で扱う。
- 部分編集を原則とし、全面再生成を避ける。
- 文字化け検出時は、当該ファイルの新規編集を止めて復旧を優先する。

## 影響ファイル

- 追加:
  - `lib/caseFindingsSchema.ts`
  - `lib/caseFindingsConfig.ts`
  - `lib/caseFindingsNormalizer.ts`
  - `lib/caseFindingsSummary.ts`
  - `components/cases/findings/*`
- 変更:
  - [components/cases/CaseFormPage.tsx](/C:/practice/medical-support-apps/components/cases/CaseFormPage.tsx)
  - [components/cases/CaseFormSummaryTab.tsx](/C:/practice/medical-support-apps/components/cases/CaseFormSummaryTab.tsx)
  - 旧 `CaseFinding*` 系ファイル群

## 非目標

- 病院側 UI の同時刷新
- API 仕様全体の刷新
- 所見以外の基本情報・バイタル入力の再設計

## 検証方針

- まず `npm run check` を通す。
- 所見保存 payload の読込/再保存が崩れないことを確認する。
- 既存ケースの旧 `findings` 読込で画面が落ちないことを確認する。
- 主要な日本語ラベルと summary に文字化けがないことを確認する。