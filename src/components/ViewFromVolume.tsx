import { signal, useSignal, useSignalEffect } from "@preact/signals";
import { Urn } from "forma-embedded-view-sdk/elements/types";
import { styled } from "goober";
import { AnalysisResult } from "../lib/analyzeViewFromVolume.worker";
import AnalyzeViewFromVolumeWorker from "../lib/analyzeViewFromVolume.worker?worker";
import { useTranslation } from "../lib/useTranslation";
import {
  SOURCE_COLOR,
  SOURCE_COLOR_TRANSPARENT,
  TARGET_COLOR,
  TARGET_COLOR_TRANSPARENT,
  visualizePreviewSourcePoints,
  visualizePreviewTargetPoints,
  visualizeViewFromVolumeAnalysisResult,
} from "../lib/render";
import { getAreaMeasurementPoints } from "../lib/sample-area";
import { getVolumeMeasurementPoints } from "../lib/sample-volume";
import {
  currentSelectionState,
  inspectionState,
  Point,
  sceneState,
  selectionModeState,
  tracingDensitySource,
  tracingDensityTarget,
  visibleTargetPointsState,
} from "../lib/state";
import {
  getPathAsMesh,
  getSelectedElementsByType,
  parseAnalysisResult,
} from "../lib/utils";
import AnalysisStats, { AnalysisStatsData } from "./AnalysisStats";
import { GeometrySelectionButton } from "./GeometrySelectionButton";

export type DensityParameters = {
  minDistance: number;
  maxAttempts: number;
  resolution: number;
};

const SOURCE_DENSITY_PARAMETERS: { [key: string]: DensityParameters } = {
  high: { minDistance: 1.5, maxAttempts: 5, resolution: 0.5 },
  medium: {
    minDistance: 2,
    maxAttempts: 5,
    resolution: 0.4,
  },
  low: {
    minDistance: 3,
    maxAttempts: 5,
    resolution: 0.3,
  },
};

const TARGET_DENSITY_PARAMETERS: { [key: string]: DensityParameters } = {
  high: {
    minDistance: 1.5,
    maxAttempts: 5,
    resolution: 0.5,
  },
  medium: {
    minDistance: 2,
    maxAttempts: 5,
    resolution: 0.4,
  },
  low: {
    minDistance: 3,
    maxAttempts: 5,
    resolution: 0.3,
  },
};

export type AnalysisProgress = {
  analysisProgress: number;
};

const RunButton = styled("weave-button")`
  width: 100%;
  margin-bottom: 4px;
`;

const analyzeViewFromVolumeWorker = signal(new AnalyzeViewFromVolumeWorker());

type Element = {
  path: string;
  urn: Urn;
};

export default function ViewFromVolume2() {
  const { t } = useTranslation();
  const sourceElementsSelectionState = useSignal<
    | {
        volumeElements: Element[];
        areaElements: Element[];
      }
    | undefined
  >(undefined);
  const targetElementsSelectionState = useSignal<
    | {
        areaElements: Element[];
        volumeElements: Element[];
      }
    | undefined
  >(undefined);

  const sourceMeasurementPointsState = useSignal<Point[] | undefined>(
    undefined
  );

  const targetMeasurementPointsState = useSignal<Point[] | undefined>(
    undefined
  );

  const analysisProgressState = useSignal<number | undefined>(undefined);

  const analysisStatsDataState = useSignal<AnalysisStatsData[] | undefined>(
    undefined
  );

  function resetWorker() {
    analyzeViewFromVolumeWorker.peek().terminate();
    analyzeViewFromVolumeWorker.value = new AnalyzeViewFromVolumeWorker();
    analysisProgressState.value = undefined;
  }

  const analyzeOnMessageFromWorker = (
    e: MessageEvent<AnalysisResult | AnalysisProgress>
  ) => {
    if ("analysisProgress" in e.data) {
      analysisProgressState.value = e.data.analysisProgress;
      return;
    }

    const result = e.data as AnalysisResult;
    visibleTargetPointsState.value = e.data.visibleTargetPoints;
    visualizePreviewTargetPoints(visibleTargetPointsState.value);
    visualizeViewFromVolumeAnalysisResult(result);
    analysisProgressState.value = undefined;

    analysisStatsDataState.value = parseAnalysisResult(
      result.sourcePointCoverage.map((p) => p.percentage)
    );
  };

  // Handle source/target selection
  // @ts-ignore
  useSignalEffect(async () => {
    if (!currentSelectionState.value.length) return;

    const { areaElements, volumeElements } = await getSelectedElementsByType(
      currentSelectionState.value
    );

    switch (selectionModeState.value) {
      case "source":
        if (!volumeElements.length && !volumeElements) return;
        sourceElementsSelectionState.value = { volumeElements, areaElements };
        break;
      case "target":
        if (!areaElements.length && !volumeElements.length) return;

        targetElementsSelectionState.value = { areaElements, volumeElements };
        break;
    }
  });

  const getMeasurementPointsFromElements = async (
    volumeElements: Element[],
    areaElements: Element[],
    densityParameters: DensityParameters
  ): Promise<Point[]> => {
    const volumePaths = volumeElements.map((e) => e.path);
    const volumeMesh = await getPathAsMesh(volumePaths);

    const { minDistance, maxAttempts, resolution } = densityParameters;

    const areaMeasurementPoints = await getAreaMeasurementPoints(
      areaElements,
      resolution
    );
    const volumeMeasurementPoints = getVolumeMeasurementPoints(
      volumeMesh,
      minDistance,
      maxAttempts
    );

    return [...areaMeasurementPoints, ...volumeMeasurementPoints];
  };

  // Compute source measurement points from selected source elements
  // @ts-ignore
  useSignalEffect(async () => {
    tracingDensitySource.value;
    if (!sourceElementsSelectionState.value) return;

    const { volumeElements, areaElements } = sourceElementsSelectionState.value;

    const measurementPoints = await getMeasurementPointsFromElements(
      volumeElements,
      areaElements,
      SOURCE_DENSITY_PARAMETERS[tracingDensitySource.value]
    );

    sourceMeasurementPointsState.value = measurementPoints;

    visualizePreviewSourcePoints(measurementPoints);
  });

  // Compute target measurement points from selected target elements
  // @ts-ignore
  useSignalEffect(async () => {
    tracingDensityTarget.value;
    if (!targetElementsSelectionState.value) return;

    const { areaElements, volumeElements } = targetElementsSelectionState.value;

    const measurementPoints = await getMeasurementPointsFromElements(
      volumeElements,
      areaElements,
      TARGET_DENSITY_PARAMETERS[tracingDensityTarget.value]
    );

    targetMeasurementPointsState.value = measurementPoints;

    visualizePreviewTargetPoints(measurementPoints);
  });

  // Update target measurement points preview when source geometry changes after an analysis
  useSignalEffect(() => {
    sourceMeasurementPointsState.value;
    if (!targetMeasurementPointsState.value || !analysisStatsDataState.peek())
      return;

    analysisStatsDataState.value = undefined;
    visualizePreviewTargetPoints([...targetMeasurementPointsState.value]);
  });

  // Update source measurement points preview when target geometry changes after an analysis
  useSignalEffect(() => {
    targetMeasurementPointsState.value;
    if (!sourceMeasurementPointsState.value || !analysisStatsDataState.peek())
      return;

    analysisStatsDataState.value = undefined;
    visualizePreviewSourcePoints([...sourceMeasurementPointsState.value]);
  });

  const runAnalysis = () => {
    if (
      !sourceMeasurementPointsState.value ||
      !targetMeasurementPointsState.value ||
      !sceneState.peek()
    )
      return;
    resetWorker();
    analysisProgressState.value = 0;

    analysisStatsDataState.value = undefined;

    // Start new analysis worker
    analyzeViewFromVolumeWorker.peek().onmessage = analyzeOnMessageFromWorker;

    analyzeViewFromVolumeWorker.peek().postMessage({
      sourceMeasurementPoints: sourceMeasurementPointsState.value,
      targetMeasurementPoints: targetMeasurementPointsState.value,
      sceneVertexPositions: sceneState.peek(),
    });
  };

  const stopAnalysis = () => {
    resetWorker();
  };

  const numSelectedSources =
    (sourceElementsSelectionState.value?.volumeElements.length ?? 0) +
    (sourceElementsSelectionState.value?.areaElements.length ?? 0);
  const numSelectedTargets =
    (targetElementsSelectionState.value?.areaElements.length ?? 0) +
    (targetElementsSelectionState.value?.volumeElements.length ?? 0);

  const isAnalysisInProgress = analysisProgressState.value !== undefined;
  const isGeometrySelected = numSelectedSources > 0 && numSelectedTargets > 0;

  return (
    <div>
      <GeometrySelectionButton
        buttonText={t("geometry.source")}
        color={SOURCE_COLOR}
        backgroundColor={SOURCE_COLOR_TRANSPARENT}
        elementsSelected={numSelectedSources}
        isSelected={selectionModeState.value === "source"}
        onClick={() => (selectionModeState.value = "source")}
        disabled={inspectionState.value}
      />
      <GeometrySelectionButton
        buttonText={t("geometry.target")}
        color={TARGET_COLOR}
        backgroundColor={TARGET_COLOR_TRANSPARENT}
        elementsSelected={numSelectedTargets}
        isSelected={selectionModeState.value === "target"}
        onClick={() => (selectionModeState.value = "target")}
        disabled={inspectionState.value}
      />

      {isAnalysisInProgress && (
        <RunButton onClick={stopAnalysis} variant="outlined">
          {t("analysis.cancel")}
        </RunButton>
      )}

      {!isGeometrySelected && (
        <weave-tooltip
          text={t("analysis.selectGeometry")}
          width="200px"
          style="width: 100%"
        >
          <RunButton variant="solid" disabled={true}>
            {t("analysis.run")}
          </RunButton>
        </weave-tooltip>
      )}

      {isGeometrySelected && !isAnalysisInProgress && (
        <RunButton
          variant="solid"
          onClick={runAnalysis}
          disabled={inspectionState.value}
        >
          {t("analysis.run")}
        </RunButton>
      )}

      {analysisProgressState.value !== undefined && (
        <div style="width: 100%;height: 20px;margin-top: 8px">
          <weave-progress-bar percentcomplete={analysisProgressState.value} />
        </div>
      )}

      {analysisStatsDataState.value && (
        <AnalysisStats data={analysisStatsDataState.value} />
      )}
    </div>
  );
}
