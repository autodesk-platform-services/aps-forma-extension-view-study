import { signal } from "@preact/signals";
import { Forma } from "forma-embedded-view-sdk/auto";
import { Vector3 } from "three";
import i18n from "./i18n";
import { getSceneVertexPositions } from "./utils";
import { AnalysisResult as ViewFromPointAnalysisResult } from "../lib/analyzeViewFromPoint.worker";

export type Point = {
  pos: Vector3;
  normal: Vector3;
};

export const sceneState = signal<Float32Array | null>(null);
export const inspectionState = signal<boolean>(false);

// Selection state
export type SelectionMode = "source" | "target";
export const selectionModeState = signal<SelectionMode>("source");
export const currentSelectionState = signal<string[]>([]);

// Settings state
export const DENSITY_SOURCE_DEFAULT = "medium";
export const DENSITY_TARGET_DEFAULT = "medium";
type Densities = "low" | "medium" | "high";

export const tracingDensitySource = signal<Densities>(
  (localStorage.getItem("tracingDensity-source") as Densities) ??
    DENSITY_SOURCE_DEFAULT
);
export const tracingDensityTarget = signal<Densities>(
  (localStorage.getItem("tracingDensity-target") as Densities) ??
    DENSITY_TARGET_DEFAULT
);

export const showViewLines = signal<boolean>(
  localStorage.getItem("showViewLines") === "false" ? false : true
);

window.addEventListener("storage", (event) => {
  if (event.key === "tracingDensity-source") {
    tracingDensitySource.value =
      (event.newValue as Densities) ?? DENSITY_SOURCE_DEFAULT;
  } else if (event.key === "tracingDensity-target") {
    tracingDensityTarget.value =
      (event.newValue as Densities) ?? DENSITY_TARGET_DEFAULT;
  } else if (event.key === "showViewLines") {
    showViewLines.value = event.newValue === "false" ? false : true;
  }
});

// Analysis state
export const visibleTargetPointsState = signal<Point[] | undefined>(undefined);
export const analysisResultPointState = signal<
  ViewFromPointAnalysisResult | undefined
>(undefined);

/** Retrieve current scene when loading the extension */
getSceneVertexPositions().then((scene) => {
  sceneState.value = scene;
});
/** Retrieve new scene when proposal changes */
Forma.proposal.subscribe(
  () => {
    getSceneVertexPositions().then((scene) => {
      sceneState.value = scene;
    });
  },
  { debouncedPersistedOnly: true }
);

Forma.selection.getSelection().then((paths) => {
  currentSelectionState.value = paths;
});
/** Subscribe the the current selection from Forma */
Forma.selection.subscribe(({ paths }) => {
  currentSelectionState.value = paths;
});

// Handle locale updates from Forma
Forma.onLocaleUpdate(({ locale }) => {
  i18n.changeLanguage(locale);
});
