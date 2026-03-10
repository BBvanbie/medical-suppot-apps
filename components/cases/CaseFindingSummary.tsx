import { Fragment, type ReactNode } from "react";

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

export function renderChangedDetail(detail: string): ReactNode {
  const normalized = detail.replace(/\+\/-:/g, "有無:");
  const parts = normalized.split(/\s+/).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
      {parts.map((part, idx) => {
        const withSuffix = part.match(/^(.+?):([+-])\((.*)\)$/);
        if (withSuffix) {
          const symbol = withSuffix[2] === "+" ? "＋" : "ー";
          const colorClass = withSuffix[2] === "+" ? "font-bold text-rose-600" : "font-bold text-sky-600";
          return (
            <Fragment key={`${part}-${idx}`}>
              {idx > 0 ? <span> / </span> : null}
              <span>
                {withSuffix[1]} {" : "}（<span className={colorClass}>{symbol}</span>）({withSuffix[3]})
              </span>
            </Fragment>
          );
        }

        const basic = part.match(/^(.+?):([+-])$/);
        if (basic) {
          const symbol = basic[2] === "+" ? "＋" : "ー";
          const colorClass = basic[2] === "+" ? "font-bold text-rose-600" : "font-bold text-sky-600";
          return (
            <Fragment key={`${part}-${idx}`}>
              {idx > 0 ? <span> / </span> : null}
              <span>
                {basic[1]} {" : "}（<span className={colorClass}>{symbol}</span>）
              </span>
            </Fragment>
          );
        }

        const generic = part.match(/^(.+?):(.+)$/);
        if (generic) {
          return (
            <Fragment key={`${part}-${idx}`}>
              {idx > 0 ? <span> / </span> : null}
              <span>
                {generic[1]} {" : "} {generic[2]}
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
    headache: `+/-:${neuro.headachePositive ? "+" : "-"} 性状:${neuro.headacheQuality} 行動:${neuro.headacheAction}${
      neuro.headacheAction === "その他" && neuro.headacheActionOther ? `(${neuro.headacheActionOther})` : ""
    } 経過:${neuro.headacheCourse} その他:${asSummaryValue(neuro.headacheOther)}`,
    nausea: `+/-:${neuro.nauseaPositive ? "+" : "-"} 経過:${neuro.nauseaCourse} その他:${asSummaryValue(neuro.nauseaOther)}`,
    vomit: `+/-:${neuro.vomitPositive ? "+" : "-"} 性状:${neuro.vomitQuality} 回数:${
      neuro.vomitCountMode === "confirmed"
        ? `確定 ${asSummaryValue(neuro.vomitCountConfirmed)}`
        : `推定 ${asSummaryValue(neuro.vomitCountMin)}?${asSummaryValue(neuro.vomitCountMax)}`
    } その他:${asSummaryValue(neuro.vomitOther)}`,
    dizziness: `+/-:${neuro.dizzinessPositive ? "+" : "-"} 性状:${neuro.dizzinessType} 行動:${neuro.dizzinessAction}${
      neuro.dizzinessAction === "その他" && neuro.dizzinessActionOther ? `(${neuro.dizzinessActionOther})` : ""
    } 経過:${neuro.dizzinessCourse} 既往:${neuro.dizzinessPast ? `有(${asSummaryValue(neuro.dizzinessPastWhen)})` : "無"} 耳鳴り:${
      neuro.tinnitusPositive ? "+" : "-"
    } 耳閉感:${neuro.earFullnessPositive ? "+" : "-"}`,
    numbness: `有無:${neuro.numbnessPositive ? "+" : "-"} 部位:${asSummaryValue(neuro.numbnessSite)}`,
    paralysis: `発症:${asSummaryValue(neuro.paralysisOnsetDate)} ${asSummaryValue(
      neuro.paralysisOnsetTime,
    )} 行動:${neuro.paralysisAction}${
      neuro.paralysisAction === "その他" && neuro.paralysisActionOther ? `(${neuro.paralysisActionOther})` : ""
    } 最終健常:${asSummaryValue(neuro.paralysisLastKnownDate)} ${asSummaryValue(
      neuro.paralysisLastKnownTime,
    )} 麻痺部位:${asSummaryValue(neuro.paralysisSite)} 偏視:${asSummaryValue(neuro.paralysisGaze)}`,
    "chest-pain": `+/-:${cardio.chestPainPositive ? "+" : "-"} 行動:${cardio.chestPainAction}${
      cardio.chestPainAction === "その他" && cardio.chestPainActionOther ? `(${cardio.chestPainActionOther})` : ""
    } 部位:${asSummaryValue(cardio.chestPainLocation)} 性状:${asSummaryValue(
      cardio.chestPainQuality,
    )} 疼痛移動:${cardio.chestPainRadiation ? `+(${asSummaryValue(cardio.chestPainRadiationCourse)})` : "-"} NRS:${asSummaryValue(
      cardio.chestPainNrs,
    )} 冷汗:${cardio.coldSweatPositive ? "+" : "-"} 顔面蒼白:${cardio.facialPallorPositive ? "+" : "-"}`,
    "chest-discomfort": `圧迫感:${cardio.chestPressurePositive ? "+" : "-"} 不快感:${
      cardio.chestDiscomfortPositive ? "+" : "-"
    }`,
    palpitation: `行動:${cardio.palpitationAction}${
      cardio.palpitationAction === "その他" && cardio.palpitationActionOther ? `(${cardio.palpitationActionOther})` : ""
    } 経過:${cardio.palpitationCourse}`,
    jvd: `+/-:${cardio.jvdPositive ? "+" : "-"} 呼吸音:${cardio.respSound}${
      cardio.respSound === "その他" ? `(${asSummaryValue(cardio.respSoundOther)})` : ""
    }`,
    edema: `+/-:${cardio.edemaPositive ? "+" : "-"} 普段から:${cardio.edemaUsual ? "+" : "-"} 利尿剤服薬歴:${
      cardio.diureticsHistory ? "+" : "-"
    }`,
    "abdominal-pain": `+/-:${digestive.abPainPositive ? "+" : "-"} 部位:${digestive.abPainRegion} 性状:${asSummaryValue(
      digestive.abPainQuality,
    )} 圧痛:${digestive.abTenderness ? "+" : "-"} 反跳痛:${digestive.abRebound ? "+" : "-"} 経過:${digestive.abPainCourse}`,
    "back-pain": `+/-:${digestive.backPainPositive ? "+" : "-"} 部位:${asSummaryValue(
      digestive.backPainSite,
    )} 性状:${asSummaryValue(digestive.backPainQuality)} 叩打痛:${digestive.cvaTenderness ? "+" : "-"} 排尿時痛:${
      digestive.dysuriaPain ? "+" : "-"
    } 血尿:${digestive.hematuriaPositive ? "+" : "-"} 随伴症状:${asSummaryValue(digestive.backAssociated)}`,
    "gi-nausea": `+/-:${digestive.giNauseaPositive ? "+" : "-"} 発症時行動:${asSummaryValue(
      digestive.giNauseaActionText,
    )} 随伴(頭痛:${digestive.giNauseaHeadache ? "+" : "-"} めまい:${digestive.giNauseaDizziness ? "+" : "-"} 痺れ:${
      digestive.giNauseaNumbness ? "+" : "-"
    } その他:${asSummaryValue(digestive.giNauseaOther)}) 経過:${digestive.giNauseaCourse}`,
    "gi-vomit": `+/-:${digestive.giVomitPositive ? "+" : "-"} 回数:${asSummaryValue(digestive.giVomitCount)}`,
    diarrhea: `+/-:${digestive.diarrheaPositive ? "+" : "-"} 回数:${asSummaryValue(digestive.diarrheaCount)}`,
    hematemesis: `+/-:${digestive.hematemesisPositive ? "+" : "-"} 推定量:${asSummaryValue(
      digestive.hematemesisAmount,
    )} 色:${digestive.hematemesisColor} 性状:${digestive.hematemesisCharacter}`,
    melena: `+/-:${digestive.melenaPositive ? "+" : "-"} 推定量:${asSummaryValue(
      digestive.melenaAmount,
    )} 色:${digestive.melenaColor} 性状:${digestive.melenaCharacter}`,
    "abdominal-abnormal": `膨満感:${digestive.abDistension ? "+" : "-"} 膨隆:${
      digestive.abBulge ? `+(${digestive.abBulgeRegion})` : "-"
    } 板状硬:${digestive.boardLike ? "+" : "-"}`,
    "face-head": `${trauma.faceHeadNormal ? "異常なし" : `所見:${asSummaryValue(trauma.faceHeadTrauma)}`}`,
    neck: `${trauma.neckNormal ? "異常なし" : `所見:${asSummaryValue(trauma.neckTrauma)}`}`,
    trunk: `${trauma.trunkNormal ? "異常なし" : `所見:${asSummaryValue(trauma.trunkTrauma)}`}`,
    pelvis: `${trauma.pelvisNormal ? "異常なし" : `所見:${asSummaryValue(trauma.pelvisTrauma)}`}`,
    "upper-limb": `${trauma.upperLimbNormal ? "異常なし" : `所見:${asSummaryValue(trauma.upperLimbTrauma)}`}`,
    "lower-limb": `${trauma.lowerLimbNormal ? "異常なし" : `所見:${asSummaryValue(trauma.lowerLimbTrauma)}`}`,
  };
}
