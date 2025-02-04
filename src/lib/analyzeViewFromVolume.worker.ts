import * as THREE from "three";
import { acceleratedRaycast } from "three-mesh-bvh";

import { computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";

const ANALYSIS_PROGRESS_INTERVALS = {
  visibleSourcePoints: { startProgress: 0, endProgress: 30 },
  visibleTargetPoints: { startProgress: 30, endProgress: 60 },
  viewCoverage: { startProgress: 60, endProgress: 100 },
};

// Speed up raycasting using https://github.com/gkjohnson/three-mesh-bvh
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

THREE.Mesh.prototype.raycast = acceleratedRaycast;
const raycaster = new THREE.Raycaster();
// For this analysis we only need the first hit, which is faster to compute
// @ts-ignore
raycaster.firstHitOnly = true;

type Point = {
  pos: THREE.Vector3;
  normal: THREE.Vector3;
};

export type SourcePointCoverage = {
  pos: THREE.Vector3;
  percentage: number;
}[];

export type AnalysisResult = {
  sourcePointCoverage: SourcePointCoverage;
  visibleTargetPoints: Point[];
};

export type AnalysisProgress = {
  analysisProgress: number;
};

const pointToVector3 = ({ x, y, z }: { x: number; y: number; z: number }) =>
  new THREE.Vector3(x, y, z);

function firstNonZero(intersections: THREE.Intersection[]) {
  for (let intersection of intersections) {
    if (intersection.distance > 0) {
      return intersection;
    }
  }
  return undefined;
}

function createScene(vertexPositions: Float32Array) {
  const scene = new THREE.Scene();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(vertexPositions, 3)
  );
  geometry.computeBoundsTree();
  const material = new THREE.MeshBasicMaterial();
  material.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  return scene;
}

function raycastHit(from: Point, to: Point, scene: THREE.Scene) {
  const direction = pointToVector3(to.pos).clone().sub(from.pos);
  const slightlyMovedSourcePoint = pointToVector3(from.pos)
    .clone()
    .addScaledVector(direction.clone().normalize(), 0.001);

  raycaster.set(slightlyMovedSourcePoint, direction);

  const intersections = raycaster.intersectObjects(scene.children);
  const intersection = firstNonZero(intersections);
  const canSee =
    Math.abs((intersection?.distance ?? 0) - direction.length()) < 0.003;

  return canSee && intersection;
}

/**
 * Finds the source measurement points that can see at least one target measurement point
 *
 * @param sourceMeasurementPoints
 * @param targetMeasurementPoints
 * @param scene vertex positions of all scene geometry
 * @returns
 */
function analyzeVisibleSourcePoints(
  sourceMeasurementPoints: Point[],
  targetMeasurementPoints: Point[],
  scene: THREE.Scene
) {
  const { startProgress, endProgress } =
    ANALYSIS_PROGRESS_INTERVALS.visibleSourcePoints;
  const updateProgressInterval = Math.floor(
    sourceMeasurementPoints.length / (endProgress - startProgress)
  );

  const visibleSourcePoints: Point[] = [];

  sourceMeasurementPoints.forEach((source, i) => {
    for (let target of targetMeasurementPoints) {
      if (raycastHit(target, source, scene)) {
        visibleSourcePoints.push(source);
        break;
      }
    }

    // Post progress update
    if (i % updateProgressInterval === 0) {
      self.postMessage({
        analysisProgress: startProgress + i / updateProgressInterval,
      });
    }
  });

  return visibleSourcePoints;
}

/**
 * Finds the target measurement points that can see at least one source measurement point
 *
 * @param sourceMeasurementPoints
 * @param targetMeasurementPoints
 * @param scene vertex positions of all scene geometry
 * @returns
 */
function analyzeVisibleTargetPoints(
  sourceMeasurementPoints: Point[],
  targetMeasurementPoints: Point[],
  scene: THREE.Scene
) {
  const { startProgress, endProgress } =
    ANALYSIS_PROGRESS_INTERVALS.visibleTargetPoints;
  const updateProgressInterval = Math.floor(
    targetMeasurementPoints.length / (endProgress - startProgress)
  );

  const visibleTargetPoints: Point[] = [];

  targetMeasurementPoints.forEach((target, i) => {
    for (let source of sourceMeasurementPoints) {
      if (raycastHit(target, source, scene)) {
        visibleTargetPoints.push(target);
        break;
      }
    }

    // Post progress update
    if (i % updateProgressInterval === 0) {
      self.postMessage({
        analysisProgress: startProgress + i / updateProgressInterval,
      });
    }
  });

  return visibleTargetPoints;
}

/**
 * Returns the percentage [0-1] of source points visible from each target point
 *
 * @param sourceMeasurementPoints
 * @param targetMeasurementPoints
 * @param scene vertex positions of all scene geometry
 * @returns
 */
function analyzeViewCoverage(
  sourceMeasurementPoints: Point[],
  targetMeasurementPoints: Point[],
  scene: THREE.Scene
) {
  const { startProgress, endProgress } =
    ANALYSIS_PROGRESS_INTERVALS.viewCoverage;
  const updateProgressInterval = Math.floor(
    sourceMeasurementPoints.length / (endProgress - startProgress)
  );

  const coverage: SourcePointCoverage = [];

  sourceMeasurementPoints.forEach((source, i) => {
    let targetsVisible = 0;
    targetMeasurementPoints.forEach((target) => {
      if (raycastHit(target, source, scene)) targetsVisible++;
    });

    coverage.push({
      pos: source.pos,
      percentage: targetsVisible / targetMeasurementPoints.length,
    });

    // Post progress update
    if (i % updateProgressInterval === 0) {
      self.postMessage({
        analysisProgress: startProgress + i / updateProgressInterval,
      });
    }
  });

  return coverage;
}

type WorkerInput = {
  sourceMeasurementPoints: {
    pos: THREE.Vector3;
    normal: THREE.Vector3;
  }[];
  targetMeasurementPoints: {
    pos: THREE.Vector3;
    normal: THREE.Vector3;
  }[];
  sceneVertexPositions: Float32Array;
};

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const workerInput = e.data;

  self.postMessage({
    analysisProgress: 0,
  });

  const {
    sourceMeasurementPoints,
    targetMeasurementPoints,
    sceneVertexPositions,
  } = workerInput;

  const scene = createScene(sceneVertexPositions);

  // Source measurement points that are seen by at least one target point in scene with only source geometry
  const visibleSourcePoints = analyzeVisibleSourcePoints(
    sourceMeasurementPoints,
    targetMeasurementPoints,
    scene
  );

  // Target measurement points that are seen by at least one source point in scene with only target geometry
  const visibleTargetPoints = analyzeVisibleTargetPoints(
    visibleSourcePoints,
    targetMeasurementPoints,
    scene
  );

  // Returns the number of target points visible from each source point
  const coverage = analyzeViewCoverage(
    visibleSourcePoints,
    visibleTargetPoints,
    scene
  );

  self.postMessage({
    sourcePointCoverage: coverage,
    visibleTargetPoints: visibleTargetPoints,
  });
};
