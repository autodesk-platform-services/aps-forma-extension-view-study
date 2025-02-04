import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/Addons.js";
import { Point } from "./state";

class SpatialHash {
  private grid: Map<string, Point[]>;
  private cellSize: number;

  constructor(cellSize: number) {
    this.grid = new Map();
    this.cellSize = cellSize;
  }

  private hash(point: THREE.Vector3): string {
    const x = Math.floor(point.x / this.cellSize);
    const y = Math.floor(point.y / this.cellSize);
    const z = Math.floor(point.z / this.cellSize);
    return `${x},${y},${z}`;
  }

  add(pointNormal: Point): void {
    const hash = this.hash(pointNormal.pos);
    if (!this.grid.has(hash)) {
      this.grid.set(hash, []);
    }
    this.grid.get(hash)!.push(pointNormal);
  }

  getNeighbors(point: THREE.Vector3, radius: number): Point[] {
    const neighbors: Point[] = [];
    const [px, py, pz] = this.hash(point).split(",").map(Number);
    const cellRadius = Math.ceil(radius / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const hash = `${px + dx},${py + dy},${pz + dz}`;
          const cell = this.grid.get(hash);
          if (cell) {
            neighbors.push(...cell);
          }
        }
      }
    }

    return neighbors;
  }
}

function poissonDiskSampling(
  mesh: THREE.Mesh,
  minDistance: number,
  maxAttempts: number = 5
): { pos: THREE.Vector3; normal: THREE.Vector3 }[] {
  const sampler = new MeshSurfaceSampler(mesh).build();
  const tempPosition = new THREE.Vector3();
  const tempNormal = new THREE.Vector3();
  const pointsWithNormals: Point[] = [];
  const spatialHash = new SpatialHash(minDistance / Math.sqrt(3));
  const activeList: THREE.Vector3[] = [];

  const boundingBox = new THREE.Box3().setFromObject(mesh);
  const meshSize = new THREE.Vector3();
  boundingBox.getSize(meshSize);
  const maxSamples = Math.ceil(
    (meshSize.x * meshSize.y * meshSize.z) /
      (minDistance * minDistance * minDistance)
  );

  function addPoint(point: THREE.Vector3, normal: THREE.Vector3): void {
    const pointNormal: Point = {
      pos: point.clone(),
      normal: normal.clone(),
    };
    pointsWithNormals.push(pointNormal);
    spatialHash.add(pointNormal);
    activeList.push(point.clone());
  }

  // Initial sample
  sampler.sample(tempPosition, tempNormal);
  addPoint(tempPosition, tempNormal);

  const minDistanceSq = minDistance * minDistance;

  // Main sampling loop
  while (activeList.length > 0 && pointsWithNormals.length < maxSamples) {
    const randomIndex = Math.floor(Math.random() * activeList.length);
    let found = false;

    for (let i = 0; i < maxAttempts; i++) {
      sampler.sample(tempPosition, tempNormal);

      const neighbors = spatialHash.getNeighbors(tempPosition, minDistance);
      if (
        !neighbors.some(
          (neighbor) =>
            tempPosition.distanceToSquared(neighbor.pos) < minDistanceSq
        )
      ) {
        addPoint(tempPosition, tempNormal);
        found = true;
        break;
      }
    }

    if (!found) {
      activeList.splice(randomIndex, 1);
    }
  }

  return pointsWithNormals;
}

export function getVolumeMeasurementPoints(
  mesh: THREE.Mesh,
  minDistance: number,
  maxAttempts: number
) {
  return poissonDiskSampling(mesh, minDistance, maxAttempts);
}
