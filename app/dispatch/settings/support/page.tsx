import Link from "next/link";
import { LifebuoyIcon } from "@heroicons/react/24/solid";

import { SettingPageLayout } from "@/components/settings/SettingPageLayout";
import { SettingSection } from "@/components/settings/SettingSection";
import { TrainingModeGuidePanel } from "@/components/settings/TrainingModeGuidePanel";

export default function DispatchSupportSettingsPage() {
  return (
    <SettingPageLayout
      tone="dispatch"
      eyebrow="DISPATCH SUPPORT"
      title="訓練 / デモ資料"
      description="指令 role で訓練起票を行う前に確認する手順、注意点、FAQ をまとめています。"
    >
      <SettingSection
        tone="dispatch"
        title="指令 role 向けガイド"
        description="mode 切替、起票、終了後の戻し忘れ防止まで、この画面で確認できます。"
      >
        <TrainingModeGuidePanel role="DISPATCH" tone="dispatch" />
      </SettingSection>
      <SettingSection
        tone="dispatch"
        title="関連資料"
        description="詳細運用は docs 側の runbook を正本にします。"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <article className="ds-radius-panel border border-amber-100/80 bg-amber-50/35 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <LifebuoyIcon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">設定で確認する内容</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">開始前確認、簡易フロー、注意点、FAQ は `運用モード` 画面からも確認できます。</p>
                <Link href="/dispatch/settings/mode" className="mt-3 inline-flex text-sm font-semibold text-amber-700 hover:text-amber-800">
                  運用モードを開く
                </Link>
              </div>
            </div>
          </article>
          <article className="ds-radius-panel border border-slate-200/90 bg-white px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">docs の原本</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              <li>`docs/operations/training-demo-runbook.md`</li>
              <li>`docs/plans/2026-04-13-training-mode-guidance-design.md`</li>
              <li>`docs/plans/2026-04-13-training-mode-guidance-implementation.md`</li>
            </ul>
          </article>
        </div>
      </SettingSection>
    </SettingPageLayout>
  );
}
