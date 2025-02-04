import * as THREE from "three";
import { acceleratedRaycast } from "three-mesh-bvh";

import { computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";

type Point = {
  pos: THREE.Vector3;
  normal: THREE.Vector3;
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

// Speed up raycasting using https://github.com/gkjohnson/three-mesh-bvh
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

THREE.Mesh.prototype.raycast = acceleratedRaycast;
const raycaster = new THREE.Raycaster();
// For this analysis we only need the first hit, which is faster to compute
// @ts-ignore
raycaster.firstHitOnly = true;

export type AnalysisResult = {
  sourcePoint: THREE.Vector3;
  hits: THREE.Vector3[];
  misses: THREE.Vector3[];
};

function raycastHit(from: THREE.Vector3, to: Point, scene: THREE.Scene) {
  const direction = pointToVector3(to.pos).clone().sub(from);
  const slightlyMovedSourcePoint = pointToVector3(from)
    .clone()
    .addScaledVector(direction.clone().normalize(), 0.001);

  raycaster.set(slightlyMovedSourcePoint, direction);

  const intersections = raycaster.intersectObjects(scene.children);
  const intersection = firstNonZero(intersections);
  const canSee =
    Math.abs((intersection?.distance ?? 0) - direction.length()) < 0.003;

  return canSee && intersection;
}

async function analyzeViewFromPointCoverage(
  sourcePoint: THREE.Vector3,
  visibleTargetPoints: Point[],
  scene: THREE.Scene
) {
  const canSeeTargetPoints: THREE.Vector3[] = [];
  const cantSeeTargetPoints: THREE.Vector3[] = [];

  visibleTargetPoints.forEach((target) => {
    if (raycastHit(sourcePoint, target, scene)) {
      canSeeTargetPoints.push(target.pos);
    } else {
      cantSeeTargetPoints.push(target.pos);
    }
  });

  return { canSeeTargetPoints, cantSeeTargetPoints };
}

type WorkerInput = {
  sourcePoint: THREE.Vector3;
  visibleTargetMeasurementPoints: Point[];
  sceneVertexPositions: Float32Array;
};

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const workerInput = e.data;

  const { sourcePoint, sceneVertexPositions, visibleTargetMeasurementPoints } =
    workerInput;

  const fullScene = createScene(sceneVertexPositions);
  const coverage = await analyzeViewFromPointCoverage(
    sourcePoint,
    visibleTargetMeasurementPoints,
    fullScene
  );
  self.postMessage({
    sourcePoint: sourcePoint,
    hits: coverage.canSeeTargetPoints,
    misses: coverage.cantSeeTargetPoints,
  });
};
