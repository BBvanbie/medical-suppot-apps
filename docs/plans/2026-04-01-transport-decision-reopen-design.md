# 搬送決定後の辞退再開と事案一覧送信先履歴 UI 再設計

日付: 2026-04-01

## 背景

- 現行の EMS 遷移は `TRANSPORT_DECIDED` を終端扱いしており、搬送決定後に辞退理由を付けて送信しても `Transition not allowed` になる。
- 実運用では、搬送決定後に事情変更で決定先を辞退するケースがある。
- 事案一覧の送信先履歴は 1 行 1 病院の横長 table で、病院コメント、救急隊返信、判断ボタンが狭くなり読みづらい。

## 決定した仕様

### 1. EMS 状態遷移

- `ACCEPTABLE -> TRANSPORT_DECIDED` は維持する。
- `NEGOTIATING -> TRANSPORT_DECLINED` は維持する。
- `ACCEPTABLE -> TRANSPORT_DECLINED` は維持する。
- `TRANSPORT_DECIDED -> TRANSPORT_DECLINED` を新たに許可する。

### 2. 辞退理由

- `TRANSPORT_DECLINED` への EMS 送信では、既存どおり理由選択を必須にする。
- `TRANSPORT_DECIDED -> TRANSPORT_DECLINED` でも同じ理由入力ルールを適用する。

### 3. 搬送決定解除時のデータ挙動

- 決定先ターゲットを `TRANSPORT_DECLINED` に更新する。
- `hospital_patients` の該当 target レコードを削除し、決定済みレコードを解除する。
- 他病院の状態は自動復帰しない。
- 再度送信したい病院がある場合は EMS が明示的に再送する。

### 4. ケース全体表示

- 決定済み target がなくなった時点で、ケース全体の表示は `搬送先決定` ではなく `選定中` に戻る。
- 事案一覧は `requestTargetCount > 0` かつ `TRANSPORT_DECIDED` が存在しない場合、送信先履歴が残っているケースとして扱う。

### 5. 事案一覧の送信先履歴 UI

- `detailed` variant は横長 table をやめ、病院ごとの card/list 面へ置き換える。
- 病院名、送信日時、ステータス、科目、病院コメント、救急隊返信、操作を同じ card 内で縦に読めるようにする。
- 操作ボタンは 3 等分の小型 table cell ではなく、独立した action 行として十分な幅を確保する。
- `compact` variant は既存 table を維持する。

## 影響範囲

- `lib/hospitalRequestStatus.ts`
- `lib/sendHistoryStatusRepository.ts`
- `components/cases/CaseFormPage.tsx`
- `components/cases/CaseSendHistoryTable.tsx`
- `components/cases/CaseSearchTable.tsx`
- `components/shared/CaseSelectionHistoryTable.tsx`

## 検証

- 最低限 `npm run check`
- 必要に応じて EMS の搬送判断 E2E を追加または更新する
