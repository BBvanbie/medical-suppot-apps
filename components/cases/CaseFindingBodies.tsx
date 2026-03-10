"use client";

import {
  PlusMinusToggle,
  renderTraumaFindingBody,
} from "@/components/cases/CaseFindingPrimitives";

type ToggleBinding = {
  value: boolean;
  onChange: (next: boolean) => void;
};

type TextBinding = {
  value: string;
  onChange: (next: string) => void;
};

type NeuroBindings = {
  headachePositive: ToggleBinding;
  headacheQuality: TextBinding;
  headacheAction: TextBinding;
  headacheActionOther: TextBinding;
  headacheCourse: TextBinding;
  headacheOther: TextBinding;
  nauseaPositive: ToggleBinding;
  nauseaCourse: TextBinding;
  nauseaOther: TextBinding;
  vomitPositive: ToggleBinding;
  vomitQuality: TextBinding;
  vomitCountMode: {
    value: "estimated" | "confirmed";
    onChange: (next: "estimated" | "confirmed") => void;
  };
  vomitCountConfirmed: TextBinding;
  vomitCountMin: TextBinding;
  vomitCountMax: TextBinding;
  vomitOther: TextBinding;
  dizzinessPositive: ToggleBinding;
  dizzinessType: TextBinding;
  dizzinessAction: TextBinding;
  dizzinessActionOther: TextBinding;
  dizzinessCourse: TextBinding;
  dizzinessPast: ToggleBinding;
  dizzinessPastWhen: TextBinding;
  tinnitusPositive: ToggleBinding;
  earFullnessPositive: ToggleBinding;
  numbnessPositive: ToggleBinding;
  numbnessSite: TextBinding;
  paralysisOnsetDate: TextBinding;
  paralysisOnsetTime: TextBinding;
  paralysisAction: TextBinding;
  paralysisActionOther: TextBinding;
  paralysisLastKnownDate: TextBinding;
  paralysisLastKnownTime: TextBinding;
  paralysisSite: TextBinding;
  paralysisGaze: TextBinding;
};

type CardioBindings = {
  chestPainPositive: ToggleBinding;
  chestPainAction: TextBinding;
  chestPainActionOther: TextBinding;
  chestPainLocation: TextBinding;
  chestPainQuality: TextBinding;
  chestPainRadiation: ToggleBinding;
  chestPainRadiationCourse: TextBinding;
  chestPainNrs: TextBinding;
  coldSweatPositive: ToggleBinding;
  facialPallorPositive: ToggleBinding;
  chestPressurePositive: ToggleBinding;
  chestDiscomfortPositive: ToggleBinding;
  palpitationAction: TextBinding;
  palpitationActionOther: TextBinding;
  palpitationCourse: TextBinding;
  jvdPositive: ToggleBinding;
  respSound: TextBinding;
  respSoundOther: TextBinding;
  edemaPositive: ToggleBinding;
  edemaUsual: ToggleBinding;
  diureticsHistory: ToggleBinding;
};

type DigestiveBindings = {
  abPainPositive: ToggleBinding;
  abPainRegion: TextBinding;
  abPainQuality: TextBinding;
  abTenderness: ToggleBinding;
  abRebound: ToggleBinding;
  abPainCourse: TextBinding;
  backPainPositive: ToggleBinding;
  backPainSite: TextBinding;
  backPainQuality: TextBinding;
  cvaTenderness: ToggleBinding;
  dysuriaPain: ToggleBinding;
  hematuriaPositive: ToggleBinding;
  backAssociated: TextBinding;
  giNauseaPositive: ToggleBinding;
  giNauseaActionText: TextBinding;
  giNauseaHeadache: ToggleBinding;
  giNauseaDizziness: ToggleBinding;
  giNauseaNumbness: ToggleBinding;
  giNauseaOther: TextBinding;
  giNauseaCourse: TextBinding;
  giVomitPositive: ToggleBinding;
  giVomitCount: TextBinding;
  diarrheaPositive: ToggleBinding;
  diarrheaCount: TextBinding;
  hematemesisPositive: ToggleBinding;
  hematemesisAmount: TextBinding;
  hematemesisColor: TextBinding;
  hematemesisCharacter: TextBinding;
  melenaPositive: ToggleBinding;
  melenaAmount: TextBinding;
  melenaColor: TextBinding;
  melenaCharacter: TextBinding;
  abDistension: ToggleBinding;
  abBulge: ToggleBinding;
  abBulgeRegion: TextBinding;
  boardLike: ToggleBinding;
};

type TraumaBindings = {
  faceHead: {
    value: string;
    normal: boolean;
    setValue: (value: string) => void;
    setNormal: (value: boolean) => void;
  };
  neck: {
    value: string;
    normal: boolean;
    setValue: (value: string) => void;
    setNormal: (value: boolean) => void;
  };
  trunk: {
    value: string;
    normal: boolean;
    setValue: (value: string) => void;
    setNormal: (value: boolean) => void;
  };
  pelvis: {
    value: string;
    normal: boolean;
    setValue: (value: string) => void;
    setNormal: (value: boolean) => void;
  };
  upperLimb: {
    value: string;
    normal: boolean;
    setValue: (value: string) => void;
    setNormal: (value: boolean) => void;
  };
  lowerLimb: {
    value: string;
    normal: boolean;
    setValue: (value: string) => void;
    setNormal: (value: boolean) => void;
  };
};

const inputClassName = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

function renderToggleField(label: string, binding: ToggleBinding, className: string) {
  return (
    <div className={className}>
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      <PlusMinusToggle value={binding.value} onChange={binding.onChange} />
    </div>
  );
}

export function renderNeuroFindingBody(
  middleId: string,
  bindings: NeuroBindings,
  options: {
    actionOptions: readonly string[];
    courseOptions: readonly string[];
  },
) {
  if (middleId === "headache") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.headachePositive, "col-span-2")}
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">性状</span><select value={bindings.headacheQuality.value} onChange={(e) => bindings.headacheQuality.onChange(e.target.value)} className={inputClassName}><option>拍動性</option><option>絞扼性</option></select></label>
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">発症時行動</span><select value={bindings.headacheAction.value} onChange={(e) => bindings.headacheAction.onChange(e.target.value)} className={inputClassName}>{options.actionOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">経過</span><select value={bindings.headacheCourse.value} onChange={(e) => bindings.headacheCourse.onChange(e.target.value)} className={inputClassName}>{options.courseOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        {bindings.headacheAction.value === "その他" ? <label className="col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">行動(その他)</span><input value={bindings.headacheActionOther.value} onChange={(e) => bindings.headacheActionOther.onChange(e.target.value)} className={inputClassName} /></label> : null}
        <label className="col-span-12"><span className="mb-1 block text-xs font-semibold text-slate-500">その他</span><input value={bindings.headacheOther.value} onChange={(e) => bindings.headacheOther.onChange(e.target.value)} className={inputClassName} /></label>
      </div>
    );
  }

  if (middleId === "nausea") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.nauseaPositive, "col-span-2")}
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">経過</span><select value={bindings.nauseaCourse.value} onChange={(e) => bindings.nauseaCourse.onChange(e.target.value)} className={inputClassName}>{options.courseOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="col-span-7"><span className="mb-1 block text-xs font-semibold text-slate-500">その他</span><input value={bindings.nauseaOther.value} onChange={(e) => bindings.nauseaOther.onChange(e.target.value)} className={inputClassName} /></label>
      </div>
    );
  }

  if (middleId === "vomit") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.vomitPositive, "col-span-2")}
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">性状</span><select value={bindings.vomitQuality.value} onChange={(e) => bindings.vomitQuality.onChange(e.target.value)} className={inputClassName}><option>食残</option><option>黄緑</option><option>コーヒー残渣様</option><option>血混じり</option></select></label>
        <div className="col-span-7">
          <span className="mb-1 block text-xs font-semibold text-slate-500">回数</span>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4 flex gap-2">
              <button type="button" onClick={() => bindings.vomitCountMode.onChange("confirmed")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${bindings.vomitCountMode.value === "confirmed" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>確定</button>
              <button type="button" onClick={() => bindings.vomitCountMode.onChange("estimated")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${bindings.vomitCountMode.value === "estimated" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>推定</button>
            </div>
            {bindings.vomitCountMode.value === "confirmed" ? (
              <input value={bindings.vomitCountConfirmed.value} onChange={(e) => bindings.vomitCountConfirmed.onChange(e.target.value.replace(/\D/g, ""))} placeholder="回数" className="col-span-4 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            ) : (
              <>
                <input value={bindings.vomitCountMin.value} onChange={(e) => bindings.vomitCountMin.onChange(e.target.value.replace(/\D/g, ""))} placeholder="最小" className="col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input value={bindings.vomitCountMax.value} onChange={(e) => bindings.vomitCountMax.onChange(e.target.value.replace(/\D/g, ""))} placeholder="最大" className="col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </>
            )}
          </div>
        </div>
        <label className="col-span-12"><span className="mb-1 block text-xs font-semibold text-slate-500">その他</span><input value={bindings.vomitOther.value} onChange={(e) => bindings.vomitOther.onChange(e.target.value)} className={inputClassName} /></label>
      </div>
    );
  }

  if (middleId === "dizziness") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.dizzinessPositive, "col-span-2")}
        <label className="col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">性状</span><select value={bindings.dizzinessType.value} onChange={(e) => bindings.dizzinessType.onChange(e.target.value)} className={inputClassName}><option>回転性</option><option>浮動性</option></select></label>
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">発症時行動</span><select value={bindings.dizzinessAction.value} onChange={(e) => bindings.dizzinessAction.onChange(e.target.value)} className={inputClassName}>{options.actionOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">経過</span><select value={bindings.dizzinessCourse.value} onChange={(e) => bindings.dizzinessCourse.onChange(e.target.value)} className={inputClassName}>{options.courseOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        {bindings.dizzinessAction.value === "その他" ? <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">行動(その他)</span><input value={bindings.dizzinessActionOther.value} onChange={(e) => bindings.dizzinessActionOther.onChange(e.target.value)} className={inputClassName} /></label> : null}
        {renderToggleField("過去にあるか", bindings.dizzinessPast, "col-span-4")}
        {bindings.dizzinessPast.value ? <label className="col-span-4"><span className="mb-1 block text-xs font-semibold text-slate-500">最終時期</span><input value={bindings.dizzinessPastWhen.value} onChange={(e) => bindings.dizzinessPastWhen.onChange(e.target.value)} className={inputClassName} /></label> : null}
        {renderToggleField("耳鳴り", bindings.tinnitusPositive, "col-span-2")}
        {renderToggleField("耳閉感", bindings.earFullnessPositive, "col-span-2")}
      </div>
    );
  }

  if (middleId === "numbness") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("有無", bindings.numbnessPositive, "col-span-2")}
        <label className="col-span-10"><span className="mb-1 block text-xs font-semibold text-slate-500">部位</span><input value={bindings.numbnessSite.value} onChange={(e) => bindings.numbnessSite.onChange(e.target.value)} className={inputClassName} /></label>
      </div>
    );
  }

  if (middleId === "paralysis") {
    return (
      <div className="grid grid-cols-12 gap-3">
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">発症時間(日付)</span><input type="date" value={bindings.paralysisOnsetDate.value} onChange={(e) => bindings.paralysisOnsetDate.onChange(e.target.value)} className={inputClassName} /></label>
        <label className="col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">発症時間(時刻)</span><input type="time" value={bindings.paralysisOnsetTime.value} onChange={(e) => bindings.paralysisOnsetTime.onChange(e.target.value)} className={inputClassName} /></label>
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">発症時行動</span><select value={bindings.paralysisAction.value} onChange={(e) => bindings.paralysisAction.onChange(e.target.value)} className={inputClassName}>{options.actionOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        {bindings.paralysisAction.value === "その他" ? <label className="col-span-4"><span className="mb-1 block text-xs font-semibold text-slate-500">行動(その他)</span><input value={bindings.paralysisActionOther.value} onChange={(e) => bindings.paralysisActionOther.onChange(e.target.value)} className={inputClassName} /></label> : null}
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">最終健常(日付)</span><input type="date" value={bindings.paralysisLastKnownDate.value} onChange={(e) => bindings.paralysisLastKnownDate.onChange(e.target.value)} className={inputClassName} /></label>
        <label className="col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">最終健常(時刻)</span><input type="time" value={bindings.paralysisLastKnownTime.value} onChange={(e) => bindings.paralysisLastKnownTime.onChange(e.target.value)} className={inputClassName} /></label>
        <label className="col-span-4"><span className="mb-1 block text-xs font-semibold text-slate-500">麻痺部位</span><input value={bindings.paralysisSite.value} onChange={(e) => bindings.paralysisSite.onChange(e.target.value)} className={inputClassName} /></label>
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">偏視</span><select value={bindings.paralysisGaze.value} onChange={(e) => bindings.paralysisGaze.onChange(e.target.value)} className={inputClassName}><option>左共同偏視</option><option>右共同偏視</option></select></label>
      </div>
    );
  }

  return <p className="text-xs text-slate-500">未設定</p>;
}

export function renderCardioFindingBody(
  middleId: string,
  bindings: CardioBindings,
  options: {
    actionOptions: readonly string[];
    courseOptions: readonly string[];
  },
) {
  if (middleId === "chest-pain") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.chestPainPositive, "col-span-2")}
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">発症時行動</span><select value={bindings.chestPainAction.value} onChange={(e) => bindings.chestPainAction.onChange(e.target.value)} className={inputClassName}>{options.actionOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        {bindings.chestPainAction.value === "その他" ? <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">行動(その他)</span><input value={bindings.chestPainActionOther.value} onChange={(e) => bindings.chestPainActionOther.onChange(e.target.value)} className={inputClassName} /></label> : null}
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">部位</span><input value={bindings.chestPainLocation.value} onChange={(e) => bindings.chestPainLocation.onChange(e.target.value)} className={inputClassName} /></label>
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">性状</span><input value={bindings.chestPainQuality.value} onChange={(e) => bindings.chestPainQuality.onChange(e.target.value)} className={inputClassName} /></label>
        {renderToggleField("疼痛の移動", bindings.chestPainRadiation, "col-span-3")}
        {bindings.chestPainRadiation.value ? <label className="col-span-4"><span className="mb-1 block text-xs font-semibold text-slate-500">移動の経過</span><input value={bindings.chestPainRadiationCourse.value} onChange={(e) => bindings.chestPainRadiationCourse.onChange(e.target.value)} className={inputClassName} /></label> : null}
        <label className="col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">NRS(0-10)</span><input type="number" min="0" max="10" value={bindings.chestPainNrs.value} onChange={(e) => bindings.chestPainNrs.onChange(e.target.value)} className={inputClassName} /></label>
        {renderToggleField("冷汗", bindings.coldSweatPositive, "col-span-2")}
        {renderToggleField("顔面蒼白", bindings.facialPallorPositive, "col-span-2")}
      </div>
    );
  }

  if (middleId === "chest-discomfort") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("圧迫感", bindings.chestPressurePositive, "col-span-3")}
        {renderToggleField("不快感", bindings.chestDiscomfortPositive, "col-span-3")}
      </div>
    );
  }

  if (middleId === "palpitation") {
    return (
      <div className="grid grid-cols-12 gap-3">
        <label className="col-span-4"><span className="mb-1 block text-xs font-semibold text-slate-500">発症時行動</span><select value={bindings.palpitationAction.value} onChange={(e) => bindings.palpitationAction.onChange(e.target.value)} className={inputClassName}>{options.actionOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        {bindings.palpitationAction.value === "その他" ? <label className="col-span-4"><span className="mb-1 block text-xs font-semibold text-slate-500">行動(その他)</span><input value={bindings.palpitationActionOther.value} onChange={(e) => bindings.palpitationActionOther.onChange(e.target.value)} className={inputClassName} /></label> : null}
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">経過</span><select value={bindings.palpitationCourse.value} onChange={(e) => bindings.palpitationCourse.onChange(e.target.value)} className={inputClassName}>{options.courseOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
      </div>
    );
  }

  if (middleId === "jvd") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.jvdPositive, "col-span-2")}
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">呼吸音</span><select value={bindings.respSound.value} onChange={(e) => bindings.respSound.onChange(e.target.value)} className={inputClassName}><option>正常</option><option>湿性ラ音</option><option>その他</option></select></label>
        {bindings.respSound.value === "その他" ? <label className="col-span-5"><span className="mb-1 block text-xs font-semibold text-slate-500">呼吸音(その他)</span><input value={bindings.respSoundOther.value} onChange={(e) => bindings.respSoundOther.onChange(e.target.value)} className={inputClassName} /></label> : null}
      </div>
    );
  }

  if (middleId === "edema") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.edemaPositive, "col-span-2")}
        {renderToggleField("普段からか？", bindings.edemaUsual, "col-span-3")}
        {renderToggleField("利尿剤服薬歴", bindings.diureticsHistory, "col-span-3")}
      </div>
    );
  }

  return <p className="text-xs text-slate-500">未設定</p>;
}

export function renderDigestiveFindingBody(
  middleId: string,
  bindings: DigestiveBindings,
  options: {
    abdominalRegionOptions: readonly string[];
    courseOptions: readonly string[];
  },
) {
  if (middleId === "abdominal-pain") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.abPainPositive, "col-span-2")}
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">部位(9分割)</span><select value={bindings.abPainRegion.value} onChange={(e) => bindings.abPainRegion.onChange(e.target.value)} className={inputClassName}>{options.abdominalRegionOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">性状</span><input value={bindings.abPainQuality.value} onChange={(e) => bindings.abPainQuality.onChange(e.target.value)} className={inputClassName} /></label>
        {renderToggleField("圧痛", bindings.abTenderness, "col-span-2")}
        {renderToggleField("反跳痛", bindings.abRebound, "col-span-2")}
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">経過</span><select value={bindings.abPainCourse.value} onChange={(e) => bindings.abPainCourse.onChange(e.target.value)} className={inputClassName}>{options.courseOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
      </div>
    );
  }

  if (middleId === "back-pain") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.backPainPositive, "col-span-2")}
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">部位</span><input value={bindings.backPainSite.value} onChange={(e) => bindings.backPainSite.onChange(e.target.value)} className={inputClassName} /></label>
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">性状</span><input value={bindings.backPainQuality.value} onChange={(e) => bindings.backPainQuality.onChange(e.target.value)} className={inputClassName} /></label>
        {renderToggleField("叩打痛", bindings.cvaTenderness, "col-span-2")}
        {renderToggleField("排尿時痛", bindings.dysuriaPain, "col-span-2")}
        {renderToggleField("血尿", bindings.hematuriaPositive, "col-span-2")}
        <label className="col-span-6"><span className="mb-1 block text-xs font-semibold text-slate-500">随伴症状</span><input value={bindings.backAssociated.value} onChange={(e) => bindings.backAssociated.onChange(e.target.value)} className={inputClassName} /></label>
      </div>
    );
  }

  if (middleId === "gi-nausea") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.giNauseaPositive, "col-span-2")}
        <label className="col-span-4"><span className="mb-1 block text-xs font-semibold text-slate-500">発症時行動</span><input value={bindings.giNauseaActionText.value} onChange={(e) => bindings.giNauseaActionText.onChange(e.target.value)} className={inputClassName} /></label>
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">経過</span><select value={bindings.giNauseaCourse.value} onChange={(e) => bindings.giNauseaCourse.onChange(e.target.value)} className={inputClassName}>{options.courseOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        <div className="col-span-12">
          <span className="mb-1 block text-xs font-semibold text-slate-500">随伴症状</span>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-2"><PlusMinusToggle value={bindings.giNauseaHeadache.value} onChange={bindings.giNauseaHeadache.onChange} /></div>
            <span className="col-span-1 self-center text-xs text-slate-500">頭痛</span>
            <div className="col-span-2"><PlusMinusToggle value={bindings.giNauseaDizziness.value} onChange={bindings.giNauseaDizziness.onChange} /></div>
            <span className="col-span-1 self-center text-xs text-slate-500">めまい</span>
            <div className="col-span-2"><PlusMinusToggle value={bindings.giNauseaNumbness.value} onChange={bindings.giNauseaNumbness.onChange} /></div>
            <span className="col-span-1 self-center text-xs text-slate-500">しびれ</span>
            <input value={bindings.giNauseaOther.value} onChange={(e) => bindings.giNauseaOther.onChange(e.target.value)} placeholder="その他" className="col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (middleId === "gi-vomit") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.giVomitPositive, "col-span-2")}
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">回数</span><input type="number" value={bindings.giVomitCount.value} onChange={(e) => bindings.giVomitCount.onChange(e.target.value.replace(/\D/g, ""))} className={inputClassName} /></label>
      </div>
    );
  }

  if (middleId === "diarrhea") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.diarrheaPositive, "col-span-2")}
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">回数</span><input type="number" value={bindings.diarrheaCount.value} onChange={(e) => bindings.diarrheaCount.onChange(e.target.value.replace(/\D/g, ""))} className={inputClassName} /></label>
      </div>
    );
  }

  if (middleId === "hematemesis") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.hematemesisPositive, "col-span-2")}
        <label className="col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">推定量</span><input type="number" value={bindings.hematemesisAmount.value} onChange={(e) => bindings.hematemesisAmount.onChange(e.target.value)} className={inputClassName} /></label>
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">色</span><select value={bindings.hematemesisColor.value} onChange={(e) => bindings.hematemesisColor.onChange(e.target.value)} className={inputClassName}><option>鮮血</option><option>暗赤色</option><option>コーヒー残渣</option></select></label>
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">性状</span><select value={bindings.hematemesisCharacter.value} onChange={(e) => bindings.hematemesisCharacter.onChange(e.target.value)} className={inputClassName}><option>血液のみ</option><option>食残</option></select></label>
      </div>
    );
  }

  if (middleId === "melena") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("+/-", bindings.melenaPositive, "col-span-2")}
        <label className="col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-500">推定量</span><input type="number" value={bindings.melenaAmount.value} onChange={(e) => bindings.melenaAmount.onChange(e.target.value)} className={inputClassName} /></label>
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">色</span><select value={bindings.melenaColor.value} onChange={(e) => bindings.melenaColor.onChange(e.target.value)} className={inputClassName}><option>鮮血</option><option>暗赤色</option><option>コーヒー残渣</option></select></label>
        <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">性状</span><select value={bindings.melenaCharacter.value} onChange={(e) => bindings.melenaCharacter.onChange(e.target.value)} className={inputClassName}><option>血液のみ</option><option>便と一緒に</option></select></label>
      </div>
    );
  }

  if (middleId === "abdominal-abnormal") {
    return (
      <div className="grid grid-cols-12 gap-3">
        {renderToggleField("膨満感", bindings.abDistension, "col-span-2")}
        {renderToggleField("膨隆", bindings.abBulge, "col-span-2")}
        {bindings.abBulge.value ? <label className="col-span-3"><span className="mb-1 block text-xs font-semibold text-slate-500">具体的部位(9分割)</span><select value={bindings.abBulgeRegion.value} onChange={(e) => bindings.abBulgeRegion.onChange(e.target.value)} className={inputClassName}>{options.abdominalRegionOptions.map((option) => <option key={option}>{option}</option>)}</select></label> : null}
        {renderToggleField("板状硬", bindings.boardLike, "col-span-2")}
      </div>
    );
  }

  return <p className="text-xs text-slate-500">未設定</p>;
}

export function renderTraumaFindingSection(
  middleId: string,
  bindings: TraumaBindings,
) {
  return renderTraumaFindingBody(middleId, {
    "face-head": {
      value: bindings.faceHead.value,
      setValue: bindings.faceHead.setValue,
      normal: bindings.faceHead.normal,
      setNormal: bindings.faceHead.setNormal,
    },
    neck: {
      value: bindings.neck.value,
      setValue: bindings.neck.setValue,
      normal: bindings.neck.normal,
      setNormal: bindings.neck.setNormal,
    },
    trunk: {
      value: bindings.trunk.value,
      setValue: bindings.trunk.setValue,
      normal: bindings.trunk.normal,
      setNormal: bindings.trunk.setNormal,
    },
    pelvis: {
      value: bindings.pelvis.value,
      setValue: bindings.pelvis.setValue,
      normal: bindings.pelvis.normal,
      setNormal: bindings.pelvis.setNormal,
    },
    "upper-limb": {
      value: bindings.upperLimb.value,
      setValue: bindings.upperLimb.setValue,
      normal: bindings.upperLimb.normal,
      setNormal: bindings.upperLimb.setNormal,
    },
    "lower-limb": {
      value: bindings.lowerLimb.value,
      setValue: bindings.lowerLimb.setValue,
      normal: bindings.lowerLimb.normal,
      setNormal: bindings.lowerLimb.setNormal,
    },
  });
}
