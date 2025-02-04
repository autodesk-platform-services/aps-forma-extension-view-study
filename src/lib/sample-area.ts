import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { Forma } from "forma-embedded-view-sdk/auto";
import { Urn } from "forma-embedded-view-sdk/elements/types";
import * as THREE from "three";
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from "three-mesh-bvh";
import { getTerrainVertexPositions } from "./utils";

// Speed up raycasting using https://github.com/gkjohnson/three-mesh-bvh
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

type Bbox = {
  min: THREE.Vector2;
  max: THREE.Vector2;
};

type GeoJsonGeometry = {
  type: string;
  coordinates: number[][][];
};

function generateGridPoints(bbox: Bbox, resolution: number) {
  const w = Math.abs(bbox.max.x - bbox.min.x);
  const h = Math.abs(bbox.max.y - bbox.min.y);

  const rows = Math.round(w * resolution);
  const cols = Math.round(h * resolution);

  const points = [];
  let step = 1 / resolution;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      points.push(
        new THREE.Vector2(bbox.min.x + i * step, bbox.min.y + j * step)
      );
    }
  }
  return points;
}

function createGeoJsonBoundingBox(geoJsonGeometry: GeoJsonGeometry) {
  const minX = Math.min(
    ...geoJsonGeometry.coordinates.map((c) => Math.min(...c.map((p) => p[0])))
  );
  const maxX = Math.max(
    ...geoJsonGeometry.coordinates.map((c) => Math.max(...c.map((p) => p[0])))
  );
  const minY = Math.min(
    ...geoJsonGeometry.coordinates.map((c) => Math.min(...c.map((p) => p[1])))
  );
  const maxY = Math.max(
    ...geoJsonGeometry.coordinates.map((c) => Math.max(...c.map((p) => p[1])))
  );

  return {
    min: new THREE.Vector2(minX, minY),
    max: new THREE.Vector2(maxX, maxY),
  } as Bbox;
}

function getGeoJsonPoints(
  geoJsonGeometry: GeoJsonGeometry,
  resolution: number
) {
  const bbox = createGeoJsonBoundingBox(geoJsonGeometry);
  const points = generateGridPoints(bbox, resolution);
  return points.filter((p) =>
    // @ts-ignore
    booleanPointInPolygon([p.x, p.y], geoJsonGeometry)
  );
}

async function projectPointsToTerrain(points: THREE.Vector2[]) {
  const vertices = await getTerrainVertexPositions();

  // Create scene to perform raycasting
  const scene = new THREE.Scene();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices!, 3));
  // @ts-ignore
  geometry.computeBoundsTree();
  const material = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const raycaster = new THREE.Raycaster();
  // For this analysis we only need the first hit, which is faster to compute
  // @ts-ignore
  raycaster.firstHitOnly = true;

  // Array to hold the resulting Vector3 positions
  const result: { pos: THREE.Vector3; normal: THREE.Vector3 }[] = [];

  // Iterate through each Vector2 point
  points.forEach((point) => {
    const origin = new THREE.Vector3(point.x, point.y, 1000);
    const direction = new THREE.Vector3(0, 0, -1);
    raycaster.set(origin, direction);

    // Perform the raycasting
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
      // If there's an intersection, use the first one
      result.push({
        pos: intersects[0].point,
        normal: intersects[0].face!.normal,
      });
    }
  });

  return result;
}

export async function getAreaMeasurementPoints(
  elements: { path: string; urn: Urn }[],
  resolution: number = 0.5
) {
  if (elements.length === 0) return [];
  const fps = await Promise.all(
    elements.map((e) =>
      Forma.elements.representations.footprint({ urn: e.urn })
    )
  );
  const transforms = await Promise.all(
    elements.map((e) => Forma.elements.getWorldTransform({ path: e.path }))
  );

  const targetPoints: THREE.Vector2[] = [];
  fps.forEach((fp, i) => {
    const selectionId = fp!.selection!.value;
    const selectedFeature = fp?.data.features.find(
      (f) => f.id === selectionId
    )!;

    // @ts-ignore
    let pp = getGeoJsonPoints(selectedFeature.geometry, resolution);

    const transformedPoints = pp
      .map((p) => new THREE.Vector3(p.x, p.y, 0))
      .map((p) =>
        p.applyMatrix4(new THREE.Matrix4().fromArray(transforms[i].transform))
      )
      .map((p) => new THREE.Vector2(p.x, p.y));
    targetPoints.push(...transformedPoints);
  });

  const projectedPoints = await projectPointsToTerrain(targetPoints);

  return projectedPoints;
}
