---
name: frontend-ui
description: 既存の Next.js / React UI パターンと `docs/UI_RULES.md` を確認したうえで、画面、レイアウト、表示状態、操作導線を小さく安全に変更するための skill。既存 UI への機能追加や見た目調整が必要なときに使う。
---

# frontend-ui

## purpose

- 既存の画面構成と UI 規則を壊さずに、利用者向けの表示と操作を改善する。

## use this skill when

- `app/` や `components/` の UI を追加・変更するとき
- フォーム、テーブル、ダイアログ、ローディング、状態表示を見直すとき
- iPad/PC 前提のレイアウトや日本語 UI 文言を整えるとき

## do not use this skill when

- 主目的が API、DB、認可、セキュリティの変更であるとき
- UI を触らず docs のみを更新するとき

## workflow

1. 近い画面と再利用可能な既存コンポーネントを探す。
2. 通常、空、読み込み中、保存中、エラー、read-only を確認する。
3. `docs/UI_RULES.md` に沿って最小変更で実装する。
4. 影響した画面で必要な検証を整理する。

## output format

- 変更概要
- 主要 UI 変更点
- 影響状態
- 検証項目

## quality bar

- 既存 UI と視覚的に連続していること
- 再利用を優先し、不要な新規抽象化を避けていること
- 状態表示の抜けがないこと

## project-specific notes

- `PortalShell` 系や settings/admin の既存パターンを優先して再利用する。
- UI 文言は日本語基準で統一する。
