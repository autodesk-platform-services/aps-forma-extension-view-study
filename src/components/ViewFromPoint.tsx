import { signal, useSignal, useSignalEffect } from "@preact/signals";
import { Forma } from "forma-embedded-view-sdk/auto";
import { styled } from "goober";
import * as THREE from "three";
import { AnalysisResult as ViewFromPointAnalysisResult } from "../lib/analyzeViewFromPoint.worker";
import AnalyzeViewFromPointWorker from "../lib/analyzeViewFromPoint.worker?worker";
import {
  clearInspectionVisualization,
  drawGroupToFormaScene,
  visualizeHitlines,
  visualizePreviewTargetPoints,
  visualizeSourcePoint,
  visualizeViewFromPointAnalysisResult,
} from "../lib/render";
import {
  analysisResultPointState,
  inspectionState,
  sceneState,
  showViewLines,
  visibleTargetPointsState,
} from "../lib/state";
import InspectionIcon from "./icons/InspectionIcon";

const Button = styled("button")`
  all: unset;
  cursor: pointer;
`;

const IconWrapper = styled<{ active: boolean }>("div")`
  fill: ${(p) => (p.active ? "var(--icon-on-pressed)" : "var(--icon-default)")};
  &:hover {
    fill: ${(p) => (p.active ? "var(--icon-on-pressed)" : "var(--icon-hover)")};
  }
`;

const analyzeViewFromPointWorker = signal(new AnalyzeViewFromPointWorker());

export default function ViewFromPoint() {
  const sourcePointState = useSignal<THREE.Vector3 | undefined>(undefined);

  const parseResultOnMessage = (
    e: MessageEvent<ViewFromPointAnalysisResult>
  ) => {
    if (!("hits" in e.data)) return;
    const result = e.data;

    visualizeViewFromPointAnalysisResult(result);
    analysisResultPointState.value = result;
  };

  // Run analysis
  const runAnalysis = () => {
    if (
      !sourcePointState.value ||
      !visibleTargetPointsState.value ||
      !sceneState.value
    )
      return;

    analyzeViewFromPointWorker.peek().terminate();
    analyzeViewFromPointWorker.value = new AnalyzeViewFromPointWorker();
    analyzeViewFromPointWorker.peek().onmessage = parseResultOnMessage;
    analyzeViewFromPointWorker.peek().postMessage({
      sourcePoint: sourcePointState.value,
      visibleTargetMeasurementPoints: visibleTargetPointsState.value,
      sceneVertexPositions: sceneState.value,
    });
  };

  const quitInspection = () => {
    inspectionState.value = false;
    sourcePointState.value = undefined;
    clearInspectionVisualization();
    if (visibleTargetPointsState.value)
      // Return visible target points to their original state
      visualizePreviewTargetPoints(visibleTargetPointsState.value);
  };

  // Handle source point selection
  // @ts-ignore
  useSignalEffect(async () => {
    if (!inspectionState.value) return;

    while (inspectionState.value) {
      const point = await Forma.designTool.getPoint();
      if (!point || !inspectionState.value) break; // Cancelled by user

      const source = new THREE.Vector3(point.x, point.y, point.z);
      sourcePointState.value = source;
      visualizeSourcePoint(source);
      runAnalysis();
    }

    quitInspection();
  });

  // Visualize analysis hitlines
  useSignalEffect(() => {
    if (
      !analysisResultPointState.value ||
      !inspectionState.value ||
      !showViewLines.value
    )
      return;

    visualizeHitlines(analysisResultPointState.value);
  });

  // Remove hitlines if they are turned off
  useSignalEffect(() => {
    if (!showViewLines.value)
      drawGroupToFormaScene(new THREE.Group(), "hitlines");
  });

  const onClick = () => {
    inspectionState.value ? quitInspection() : (inspectionState.value = true);
  };

  return (
    <weave-tooltip text="Inspect view lines from source" nub="down-right">
      <Button onClick={onClick}>
        <IconWrapper active={inspectionState.value}>
          <InspectionIcon />
        </IconWrapper>
      </Button>
    </weave-tooltip>
  );
}
