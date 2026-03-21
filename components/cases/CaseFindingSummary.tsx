import { Fragment, type ReactNode } from "react";

import { parseChangedFindingDetail } from "@/lib/caseFindingsSummary";

type FindingPayload = {
  neuro: {
    headachePositive: boolean;
    headacheQuality: string;
    headacheAction: string;
    headacheActionOther: string;
    headacheCourse: string;
    headacheOther: string;
    nauseaPositive: boolean;
    nauseaCourse: string;
    nauseaOther: string;
    vomitPositive: boolean;
    vomitQuality: string;
    vomitCountMode: "estimated" | "confirmed";
    vomitCountConfirmed: string;
    vomitCountMin: string;
    vomitCountMax: string;
    vomitOther: string;
    dizzinessPositive: boolean;
    dizzinessType: string;
    dizzinessAction: string;
    dizzinessActionOther: string;
    dizzinessCourse: string;
    dizzinessPast: boolean;
    dizzinessPastWhen: string;
    tinnitusPositive: boolean;
    earFullnessPositive: boolean;
    numbnessPositive: boolean;
    numbnessSite: string;
    paralysisOnsetDate: string;
    paralysisOnsetTime: string;
    paralysisAction: string;
    paralysisActionOther: string;
    paralysisLastKnownDate: string;
    paralysisLastKnownTime: string;
    paralysisSite: string;
    paralysisGaze: string;
  };
  cardio: {
    chestPainPositive: boolean;
    chestPainAction: string;
    chestPainActionOther: string;
    chestPainLocation: string;
    chestPainQuality: string;
    chestPainRadiation: boolean;
    chestPainRadiationCourse: string;
    chestPainNrs: string;
    coldSweatPositive: boolean;
    facialPallorPositive: boolean;
    chestPressurePositive: boolean;
    chestDiscomfortPositive: boolean;
    palpitationAction: string;
    palpitationActionOther: string;
    palpitationCourse: string;
    jvdPositive: boolean;
    respSound: string;
    respSoundOther: string;
    edemaPositive: boolean;
    edemaUsual: boolean;
    diureticsHistory: boolean;
  };
  digestive: {
    abPainPositive: boolean;
    abPainRegion: string;
    abPainQuality: string;
    abTenderness: boolean;
    abRebound: boolean;
    abPainCourse: string;
    backPainPositive: boolean;
    backPainSite: string;
    backPainQuality: string;
    cvaTenderness: boolean;
    dysuriaPain: boolean;
    hematuriaPositive: boolean;
    backAssociated: string;
    giNauseaPositive: boolean;
    giNauseaActionText: string;
    giNauseaHeadache: boolean;
    giNauseaDizziness: boolean;
    giNauseaNumbness: boolean;
    giNauseaOther: string;
    giNauseaCourse: string;
    giVomitPositive: boolean;
    giVomitCount: string;
    diarrheaPositive: boolean;
    diarrheaCount: string;
    hematemesisPositive: boolean;
    hematemesisAmount: string;
    hematemesisColor: string;
    hematemesisCharacter: string;
    melenaPositive: boolean;
    melenaAmount: string;
    melenaColor: string;
    melenaCharacter: string;
    abDistension: boolean;
    abBulge: boolean;
    abBulgeRegion: string;
    boardLike: boolean;
  };
  trauma: {
    faceHeadTrauma: string;
    faceHeadNormal: boolean;
    neckTrauma: string;
    neckNormal: boolean;
    trunkTrauma: string;
    trunkNormal: boolean;
    pelvisTrauma: string;
    pelvisNormal: boolean;
    upperLimbTrauma: string;
    upperLimbNormal: boolean;
    lowerLimbTrauma: string;
    lowerLimbNormal: boolean;
  };
};

function yesNo(flag: boolean): string {
  return flag ? "+" : "-";
}

function appendOther(base: string, other: string): string {
  return base === "その他" && other ? `${base}(${other})` : base;
}

function traumaDetail(normal: boolean, detail: string): string {
  return normal ? "異常なし" : `損傷:${detail}`;
}

function splitDetailSegments(detail: string): string[] {
  const segments: string[] = [];
  let depth = 0;
  let buffer = "";

  for (let index = 0; index < detail.length; index += 1) {
    const char = detail[index];
    if (char === "(") depth += 1;
    if (char === ")" && depth > 0) depth -= 1;

    if (char === " " && depth === 0) {
      const normalized = buffer.trim();
      if (normalized) segments.push(normalized);
      buffer = "";
      continue;
    }

    buffer += char;
  }

  const tail = buffer.trim();
  if (tail) segments.push(tail);
  return segments;
}

function parseStateValue(value: string): { symbol: string; detail: string | null; tone: string } | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const detailed = normalized.match(/^([+\-\uff0b\uff0d])(\((.*)\))?$/);
  if (detailed) {
    const symbol = detailed[1] === "-" || detailed[1] === "\uff0d" ? "\uff0d" : "\uff0b";
    return {
      symbol,
      detail: detailed[3]?.trim() || null,
      tone: symbol === "\uff0b" ? "font-bold text-rose-600" : "text-sky-600",
    };
  }

  if (normalized === "\u78ba\u8a8d\u56f0\u96e3") {
    return { symbol: "\u78ba\u8a8d\u56f0\u96e3", detail: null, tone: "text-slate-600" };
  }

  return null;
}

export function renderChangedDetail(detail: string): ReactNode {
  const structured = parseChangedFindingDetail(detail);
  if (structured) {
    const statusState = structured.status ? parseStateValue(structured.status) : null;

    return (
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        {statusState ? (
          <span>
            状態 : <span className={statusState.tone}>{statusState.symbol}</span>
            {statusState.detail ? ` (${statusState.detail})` : null}
          </span>
        ) : null}
        {structured.fields.map((field, idx) => {
          const state = parseStateValue(field.value);
          return (
            <Fragment key={`${field.label}-${field.value}-${idx}`}>
              {statusState || idx > 0 ? <span> / </span> : null}
              <span>
                {field.label} : {state ? <span className={state.tone}>{state.symbol}</span> : field.value}
                {state?.detail ? ` (${state.detail})` : null}
              </span>
            </Fragment>
          );
        })}
      </div>
    );
  }

  const parts = splitDetailSegments(detail);

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
      {parts.map((part, idx) => {
        const labeled = part.match(/^(.+?):\s*(.+)$/);
        if (labeled) {
          const state = parseStateValue(labeled[2]);
          if (state) {
            return (
              <Fragment key={`${part}-${idx}`}>
                {idx > 0 ? <span> / </span> : null}
                <span>
                  {labeled[1]} : <span className={state.tone}>{state.symbol}</span>
                  {state.detail ? ` (${state.detail})` : null}
                </span>
              </Fragment>
            );
          }

          return (
            <Fragment key={`${part}-${idx}`}>
              {idx > 0 ? <span> / </span> : null}
              <span>
                {labeled[1]} : {labeled[2]}
              </span>
            </Fragment>
          );
        }

        return (
          <Fragment key={`${part}-${idx}`}>
            {idx > 0 ? <span> / </span> : null}
            <span>{part}</span>
          </Fragment>
        );
      })}
    </div>
  );
}


export function createChangedDetailMap(
  findings: FindingPayload,
  asSummaryValue: (value: string) => string,
): Record<string, string> {
  const { neuro, cardio, digestive, trauma } = findings;

  return {
    headache: `+/-:${yesNo(neuro.headachePositive)} 性状:${neuro.headacheQuality} 状況:${appendOther(neuro.headacheAction, neuro.headacheActionOther)} 経過:${neuro.headacheCourse} その他:${asSummaryValue(neuro.headacheOther)}`,
    nausea: `+/-:${yesNo(neuro.nauseaPositive)} 経過:${neuro.nauseaCourse} その他:${asSummaryValue(neuro.nauseaOther)}`,
    vomit: `+/-:${yesNo(neuro.vomitPositive)} 性状:${neuro.vomitQuality} 回数:${
      neuro.vomitCountMode === "confirmed"
        ? `確定${asSummaryValue(neuro.vomitCountConfirmed)}`
        : `推定${asSummaryValue(neuro.vomitCountMin)}-${asSummaryValue(neuro.vomitCountMax)}`
    } その他:${asSummaryValue(neuro.vomitOther)}`,
    dizziness: `+/-:${yesNo(neuro.dizzinessPositive)} 性状:${neuro.dizzinessType} 状況:${appendOther(neuro.dizzinessAction, neuro.dizzinessActionOther)} 経過:${neuro.dizzinessCourse} 既往:${neuro.dizzinessPast ? asSummaryValue(neuro.dizzinessPastWhen) : "なし"} 耳鳴:${yesNo(neuro.tinnitusPositive)} 耳閉感:${yesNo(neuro.earFullnessPositive)}`,
    numbness: `+/-:${yesNo(neuro.numbnessPositive)} 部位:${asSummaryValue(neuro.numbnessSite)}`,
    paralysis: `発症:${asSummaryValue(neuro.paralysisOnsetDate)} ${asSummaryValue(neuro.paralysisOnsetTime)} 状況:${appendOther(neuro.paralysisAction, neuro.paralysisActionOther)} 最終健常:${asSummaryValue(neuro.paralysisLastKnownDate)} ${asSummaryValue(neuro.paralysisLastKnownTime)} 部位:${asSummaryValue(neuro.paralysisSite)} 注視:${asSummaryValue(neuro.paralysisGaze)}`,
    "chest-pain": `+/-:${yesNo(cardio.chestPainPositive)} 状況:${appendOther(cardio.chestPainAction, cardio.chestPainActionOther)} 部位:${asSummaryValue(cardio.chestPainLocation)} 性状:${asSummaryValue(cardio.chestPainQuality)} 放散:${cardio.chestPainRadiation ? `+(${asSummaryValue(cardio.chestPainRadiationCourse)})` : "-"} NRS:${asSummaryValue(cardio.chestPainNrs)} 冷汗:${yesNo(cardio.coldSweatPositive)} 顔面蒼白:${yesNo(cardio.facialPallorPositive)}`,
    "chest-discomfort": `胸部圧迫感:${yesNo(cardio.chestPressurePositive)} 胸部不快感:${yesNo(cardio.chestDiscomfortPositive)}`,
    palpitation: `状況:${appendOther(cardio.palpitationAction, cardio.palpitationActionOther)} 経過:${cardio.palpitationCourse}`,
    jvd: `+/-:${yesNo(cardio.jvdPositive)} 呼吸音:${cardio.respSound === "その他" ? appendOther(cardio.respSound, asSummaryValue(cardio.respSoundOther)) : cardio.respSound}`,
    edema: `+/-:${yesNo(cardio.edemaPositive)} 普段から:${yesNo(cardio.edemaUsual)} 利尿薬内服:${yesNo(cardio.diureticsHistory)}`,
    "abdominal-pain": `+/-:${yesNo(digestive.abPainPositive)} 部位:${digestive.abPainRegion} 性状:${asSummaryValue(digestive.abPainQuality)} 圧痛:${yesNo(digestive.abTenderness)} 反跳痛:${yesNo(digestive.abRebound)} 経過:${digestive.abPainCourse}`,
    "back-pain": `+/-:${yesNo(digestive.backPainPositive)} 部位:${asSummaryValue(digestive.backPainSite)} 性状:${asSummaryValue(digestive.backPainQuality)} CVA叩打痛:${yesNo(digestive.cvaTenderness)} 排尿時痛:${yesNo(digestive.dysuriaPain)} 血尿:${yesNo(digestive.hematuriaPositive)} 随伴症状:${asSummaryValue(digestive.backAssociated)}`,
    "gi-nausea": `+/-:${yesNo(digestive.giNauseaPositive)} 発症状況:${asSummaryValue(digestive.giNauseaActionText)} 随伴(頭痛:${yesNo(digestive.giNauseaHeadache)} めまい:${yesNo(digestive.giNauseaDizziness)} しびれ:${yesNo(digestive.giNauseaNumbness)} その他:${asSummaryValue(digestive.giNauseaOther)}) 経過:${digestive.giNauseaCourse}`,
    "gi-vomit": `+/-:${yesNo(digestive.giVomitPositive)} 回数:${asSummaryValue(digestive.giVomitCount)}`,
    diarrhea: `+/-:${yesNo(digestive.diarrheaPositive)} 回数:${asSummaryValue(digestive.diarrheaCount)}`,
    hematemesis: `+/-:${yesNo(digestive.hematemesisPositive)} 量:${asSummaryValue(digestive.hematemesisAmount)} 色:${digestive.hematemesisColor} 性状:${digestive.hematemesisCharacter}`,
    melena: `+/-:${yesNo(digestive.melenaPositive)} 量:${asSummaryValue(digestive.melenaAmount)} 色:${digestive.melenaColor} 性状:${digestive.melenaCharacter}`,
    "abdominal-abnormal": `腹部膨満:${yesNo(digestive.abDistension)} 腹部膨隆:${digestive.abBulge ? `+(${digestive.abBulgeRegion})` : "-"} 板状硬:${yesNo(digestive.boardLike)}`,
    "face-head": traumaDetail(trauma.faceHeadNormal, asSummaryValue(trauma.faceHeadTrauma)),
    neck: traumaDetail(trauma.neckNormal, asSummaryValue(trauma.neckTrauma)),
    trunk: traumaDetail(trauma.trunkNormal, asSummaryValue(trauma.trunkTrauma)),
    pelvis: traumaDetail(trauma.pelvisNormal, asSummaryValue(trauma.pelvisTrauma)),
    "upper-limb": traumaDetail(trauma.upperLimbNormal, asSummaryValue(trauma.upperLimbTrauma)),
    "lower-limb": traumaDetail(trauma.lowerLimbNormal, asSummaryValue(trauma.lowerLimbTrauma)),
  };
}
