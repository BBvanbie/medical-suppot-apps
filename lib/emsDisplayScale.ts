export type EmsResolvedTextScale = "compact" | "default" | "large";

export type EmsViewport = {
  width: number;
  height: number;
};

export const EMS_IPAD_MAX_WIDTH = 1366;
export const EMS_IPAD_BASE_WIDTH = 1180;

export function isEmsTabletViewport(viewport: EmsViewport): boolean {
  return viewport.width > 0 && viewport.width <= EMS_IPAD_MAX_WIDTH;
}

export function resolveEmsTextScale(
  textSize: "standard" | "large" | "xlarge",
  viewport: EmsViewport,
): EmsResolvedTextScale {
  const tabletViewport = isEmsTabletViewport(viewport);

  if (textSize === "xlarge") return "large";
  if (textSize === "large") return tabletViewport ? "default" : "large";
  return tabletViewport ? "compact" : "default";
}
