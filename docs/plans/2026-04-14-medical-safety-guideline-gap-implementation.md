# 医療情報システム安全管理ガイドライン ギャップ整理 implementation

作成日: 2026-04-14

## 結論

- `docs/Guideline` の 5 文書を現行プロジェクト文書と照合し、現時点で不足している準拠項目を docs 直下へ整理した。
- あわせて `docs/current-work.md` に今後の最優先テーマとして組み込み、後続実装計画へつながる形に更新する。

## 実施内容

1. `docs/medical-safety-guideline-gap-summary.md` を追加
   - 不足項目を箇条書きで整理
   - 優先順位と今後の Phase を明記
2. `docs/current-work.md` を更新
   - 新しい最優先テーマとして `ガイドライン準拠ギャップ解消` を追加
   - 再開時の参照先に上記 summary を追加
3. docs foundation の初版を追加
   - `docs/medical-safety-responsibility-matrix.md`
   - `docs/medical-safety-risk-assessment-register.md`
   - `docs/medical-safety-evidence-matrix.md`
   - `docs/medical-safety-vendor-cloud-checklist.md`
4. operations runbook を追加
   - `docs/operations/id-inventory-runbook.md`
   - `docs/operations/audit-review-runbook.md`
   - `docs/operations/bcp-restore-drill-runbook.md`
   - `docs/operations/asset-education-runbook.md`
5. 記録テンプレートと backup 複線化確認欄を追加
   - `docs/reference/medical-safety-record-templates.md`
   - `docs/operations/backup-restore-runbook.md` に月次確認欄を追記
6. 本 implementation plan を追加
   - 今回の docs 変更内容を履歴として残す
7. 2026-04-19 の更新で、責任者割当テンプレートを運用定着向けに補強
   - `導入組織情報`、`記録保管場所`、`保管ルール` を追加
   - `責任分界表` と `規程 / 証跡一覧` から、実名版と保管責任者のひも付けを明記
8. 2026-04-19 の更新で、ネットワーク安全管理 runbook を補強
   - `構成図`、`接続点`、`FW / ACL`、`無線 LAN`、`外部接続`、`監視点`、`例外ルール` を追加
   - 実記録の保管先を責任者割当テンプレート実名版にひも付けた
9. 2026-04-19 の更新で、対外説明文書と委託先台帳を補強
   - `external-explanation-for-transport-coordination-system.md` に `外部保存`、`問い合わせ窓口`、`障害時案内`、`正式記録との違い` を追加
   - 同文書を `導入先別に派生追加できるひな形` として再定義
   - `external-explanation-for-transport-coordination-system-ems.md` を追加し、病院向けと EMS向けの 2 本を初版として揃えた
   - `vendor-registry.md` に `契約 / SLA / 証跡 / 保存リージョン / 定期見直し / 未決事項管理` を追加
   - `medical-safety-evidence-matrix.md` から両文書を正本参照できるようにした

## 次アクション

1. 導入組織ごとの実名責任者欄と記録保管場所を、導入組織単位で実データ投入する
2. 対外説明文書の説明日、説明先、承認者を導入記録へ残す
3. 委託先台帳に実事業者、SLA、保存リージョン、再委託、削除条件を投入する

## 注意点

- `真正性 / 見読性 / 保存性` は docs だけで閉じない可能性が高い。正式記録の範囲を product scope と一緒に固定する必要がある。
- `HOSPITAL` MFA 一時停止など、既存の一時措置は引き続き別 plan で管理し、この文書では混ぜない。
- 2026-04-14 の判断として、当面は `搬送調整支援システム` を主体として扱う。`診療録等連携`、`電子カルテ連携` は後続テーマとして別計画化する。
- 文書雛形が揃っても、導入組織ごとの実名、窓口、契約値、保存リージョン、説明履歴が未入力なら準拠完了とはみなさない。

## 検証

- docs-only のため `npm run check` は未実行
- 参照整合は目視で確認
