import { Forma } from "forma-embedded-view-sdk/auto";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { AnalysisResult as ViewFromPointAnalysisResult } from "./analyzeViewFromPoint.worker";
import { AnalysisResult as ViewFromVolumeAnalysisResult } from "./analyzeViewFromVolume.worker";
import { getVisibilityColor, getVisibilityLevel } from "./utils";

export const SOURCE_COLOR = "#CE55BA";
export const SOURCE_COLOR_TRANSPARENT = "#ce55ba22";
export const TARGET_COLOR = "#35A7A7";
export const TARGET_COLOR_TRANSPARENT = "#cdeaf766";

const exporter = new GLTFExporter();

/**
 *
 * @param group Three.js group to draw to Forma
 * @param id id of the Forma scene to update
 */
export async function drawGroupToFormaScene(group: THREE.Group, id: string) {
  group.matrixAutoUpdate = false;
  /* prettier-ignore */
  group.matrix.set(
              1, 0, 0, 0,
              0, 0, 1, 0,
              0, -1, 0, 0,
              0, 0, 0, 1
            )

  const resultScene = new THREE.Scene();
  resultScene.add(group);

  const gltf = await exporter.parseAsync(resultScene, { binary: true });
  if (gltf instanceof ArrayBuffer) {
    Forma.render.glb.update({
      id,
      glb: gltf as ArrayBuffer,
    });
  }
}

// Efficiently create a group of many spheres
export function createColoredMeasurementPointsGroup(
  points: { pos: THREE.Vector3; color: string }[],
  octahedron?: boolean
) {
  const group = new THREE.Group();

  const pointsByColor: { [key: string]: THREE.Vector3[] } = {};
  points.forEach(({ pos, color }) => {
    if (!pointsByColor[color]) pointsByColor[color] = [];
    pointsByColor[color].push(pos);
  });

  Object.entries(pointsByColor).forEach(([color, points]) => {
    const sphereGeometry = octahedron
      ? new THREE.OctahedronGeometry(0.6)
      : new THREE.SphereGeometry(0.6);
    const material = new THREE.MeshBasicMaterial({ color });
    const instancedMesh = new THREE.InstancedMesh(
      sphereGeometry,
      material,
      points.length
    );
    points.forEach((point, index) => {
      instancedMesh.setMatrixAt(
        index,
        new THREE.Matrix4().makeTranslation(point.x, point.y, point.z)
      );
    });
    instancedMesh.instanceMatrix.needsUpdate = true;
    group.add(instancedMesh);
  });

  return group;
}

export function createHitlineGroup(
  sourcePoint: THREE.Vector3,
  hits: THREE.Vector3[]
) {
  const group = new THREE.Group();
  if (hits.length === 0) return group;

  hits.forEach((hit) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      sourcePoint,
      hit,
    ]);
    const material = new THREE.LineBasicMaterial({
      color: getVisibilityColor("Complete"),
    });
    const line = new THREE.Line(geometry, material);
    group.add(line);
  });

  return group;
}

export async function visualizeHitlines(result: ViewFromPointAnalysisResult) {
  const hitlinesGroup = createHitlineGroup(
    new THREE.Vector3(
      result.sourcePoint.x,
      result.sourcePoint.y,
      result.sourcePoint.z
    ),
    result.hits.map((p) => new THREE.Vector3(p.x, p.y, p.z))
  );
  await drawGroupToFormaScene(hitlinesGroup, "hitlines");
}

export async function visualizeSourcePoint(sourcePoint: THREE.Vector3) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(0.6);
  const material = new THREE.MeshBasicMaterial({ color: 0xb37bfc });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(sourcePoint.x, sourcePoint.y, sourcePoint.z);
  group.add(sphere);
  await drawGroupToFormaScene(group, "source-point");
}

export async function clearInspectionVisualization() {
  await drawGroupToFormaScene(new THREE.Group(), "hitlines");
  await drawGroupToFormaScene(new THREE.Group(), "source-point");
}

export async function visualizeSourceVolume(paths: string[]) {
  await Forma.render.elementColors.clearAll();
  const sourceColor = SOURCE_COLOR_TRANSPARENT;
  const pathsToColor = new Map<string, string>();
  paths.forEach((path) => pathsToColor.set(path, sourceColor));
  await Forma.render.elementColors.set({ pathsToColor });
}

export async function visualizePreviewTargetPoints(
  measurementPoints: { pos: THREE.Vector3; normal: THREE.Vector3 }[]
) {
  const previewColor = TARGET_COLOR;
  const coloredPreviewPoints = measurementPoints.map((p) => ({
    pos: p.pos,
    color: previewColor,
  }));
  const previewGroup = createColoredMeasurementPointsGroup(
    coloredPreviewPoints,
    true
  );
  await drawGroupToFormaScene(previewGroup, "target-points");
}

export async function visualizePreviewSourcePoints(
  measurementPoints: { pos: THREE.Vector3; normal: THREE.Vector3 }[]
) {
  const previewColor = SOURCE_COLOR;
  const coloredPreviewPoints = measurementPoints.map((p) => ({
    pos: p.pos,
    color: previewColor,
  }));
  const previewGroup =
    createColoredMeasurementPointsGroup(coloredPreviewPoints);
  await drawGroupToFormaScene(previewGroup, "source-points");
}

export async function visualizeViewFromVolumeAnalysisResult(
  result: ViewFromVolumeAnalysisResult
) {
  const coloredSourcePoints = result.sourcePointCoverage.map((p) => ({
    pos: new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z),
    color: getVisibilityColor(getVisibilityLevel(p.percentage)),
  }));
  const sourcePointsGroup =
    createColoredMeasurementPointsGroup(coloredSourcePoints);
  await drawGroupToFormaScene(sourcePointsGroup, "source-points");
}

export async function visualizeViewFromPointAnalysisResult(
  result: ViewFromPointAnalysisResult
) {
  const coloredHitPoints = result.hits.map((p) => ({
    pos: new THREE.Vector3(p.x, p.y, p.z),
    color: getVisibilityColor("Complete"),
  }));
  const coloredMissPoints = result.misses.map((p) => ({
    pos: new THREE.Vector3(p.x, p.y, p.z),
    color: getVisibilityColor("None"),
  }));
  const group = createColoredMeasurementPointsGroup(
    [...coloredHitPoints, ...coloredMissPoints],
    true
  );
  await drawGroupToFormaScene(group, "target-points");
}
