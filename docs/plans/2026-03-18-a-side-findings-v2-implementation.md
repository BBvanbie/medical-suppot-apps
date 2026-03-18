# A側所見入力 v2 実装手順

## 目的

- A側所見入力を資料 v1.2 準拠の構造へ移行する。
- 旧 `findings` の読取互換を維持しながら、新規保存は新構造へ統一する。
- 大規模改修を段階分割し、途中で画面全体を壊さない。

## 変更内容

### Phase 1: データ層を先に固定する

- `lib/caseFindingsSchema.ts` を追加する。
- `FindingState`、大項目、中項目、詳細項目型、初期値生成を定義する。
- `lib/caseFindingsConfig.ts` を追加する。
- 資料 v1.2 の大項目順、ラベル、入力種別、サマリー順を config 化する。
- `lib/caseFindingsNormalizer.ts` を追加する。
- 旧 `findings` を新構造へ寄せる正規化処理を追加する。

完了条件:
- 新構造の初期値を 1 か所で生成できる。
- 旧/新データの読込口が 1 か所に揃う。

### Phase 2: summary と payload を新構造へ寄せる

- `lib/caseFindingsSummary.ts` を追加する。
- 中項目ごとの summary 表示文字列と changed detail 生成を新構造へ移す。
- `CaseFormPage.tsx` の `buildCasePayload()` を新構造利用へ切り替える。

完了条件:
- 新構造から summary を生成できる。
- 保存 payload が新 `findings` を持つ。

### Phase 3: state 管理の置換

- `CaseFormPage.tsx` の所見専用 `useState` 群を段階的に置き換える。
- 単一 `findingsState` と更新 helper を導入する。
- 旧 state と新 state の混在期間を短く保つ。

完了条件:
- 所見入力で大量の個別 `useState` を使わない。
- 中項目状態変更時の詳細クリアが helper で保証される。

### Phase 4: UI 土台の差し替え

- `components/cases/findings/` に UI コンポーネント群を追加する。
- 実装順は以下とする。
  1. 共通トグル
  2. SymptomCard
  3. DetailField 系
  4. セクション描画
- 既存 `CaseFindingBodies.tsx` は新 UI 導入後に置換または縮退させる。

完了条件:
- 資料 v1.0/v1.1 の画面構造に沿った UI 土台がある。

### Phase 5: セクション単位で順次移行する

- 優先度順:
  1. 神経
  2. 循環器
  3. 消化器
  4. 呼吸器
  5. 泌尿器
  6. 筋骨格
- 各セクションで行うこと:
  - config 追加
  - UI 実装
  - summary 反映
  - 旧データ読込マッピング

完了条件:
- セクション単位で新 UI に置き換わる。
- 段階中も保存と読込が壊れない。

### Phase 6: 仕上げと縮退

- 旧 `CaseFindingPrimitives.tsx` / `CaseFindingBodies.tsx` / `CaseFindingSummary.tsx` の役割を整理する。
- 不要コードを削除する。
- `CaseFormSummaryTab.tsx` の表示を新 summary に合わせて調整する。

完了条件:
- 旧所見実装への依存が解消される。

## 運用方法

- 実装は phase ごとに区切ってコミット可能な状態を保つ。
- 文字化けを疑ったら、その時点でファイル保存結果を UTF-8 で再確認する。
- docs とコードの差分を毎 phase で見直す。

## 注意点

- 旧データ互換は「読取のみ」で止める。新 -> 旧の逆変換は作らない。
- `boolean` で症状状態を持ち続ける実装を再導入しない。
- 日本語 UI ラベルを定数化する際、エンコーディング破損に注意する。
- 途中段階で summary が旧新混在すると不整合になりやすいので、summary 層は早めに新構造へ寄せる。

## 推奨確認コマンド

- `npm run lint`
- `npm run typecheck`
- `npm run check`