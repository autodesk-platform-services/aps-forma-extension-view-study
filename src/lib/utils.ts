import { Forma } from "forma-embedded-view-sdk/auto";
import { ElementResponse } from "forma-embedded-view-sdk/elements";
import {
  Child,
  FormaElement,
  Urn,
} from "forma-embedded-view-sdk/elements/types";
import * as THREE from "three";

import { computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";

// Speed up raycasting using https://github.com/gkjohnson/three-mesh-bvh
// @ts-ignore
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
// @ts-ignore
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

/**
 * This function takes an array of float32 arrays and flattens them into a single float32 array
 */
export const float32Flatten = (chunks: Float32Array[]) => {
  //get the total number of frames on the new float32array
  const nFrames = chunks.reduce((acc, elem) => acc + elem.length, 0);

  //create a new float32 with the correct number of frames
  const result = new Float32Array(nFrames);

  //insert each chunk into the new float32array
  let currentFrame = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, currentFrame);
    currentFrame += chunk.length;
  });
  return result;
};

/**
 *
 * @param paths A list of paths to get the positions of
 * @returns A float32 array with the positions of the paths
 */
export async function getPathPositions(paths: string[]) {
  const destinationTriangles = await Promise.all(
    paths.map(async (path) => {
      return await Forma.geometry.getTriangles({
        path,
      });
    })
  );

  return float32Flatten(destinationTriangles);
}

/**
 *
 * @param paths A list of paths to get as a mesh
 * @returns A three.js mesh with the geometry of the paths
 */
export async function getPathAsMesh(paths: string[]) {
  const positions = await getPathPositions(paths);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeBoundsTree();
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
}

export async function getTerrainVertexPositions(): Promise<
  Float32Array | undefined
> {
  const rootUrn = (await Forma.proposal.getRootUrn()) as Urn;
  const { element } = await Forma.elements.get({ urn: rootUrn });

  const terrainKey = element.children?.find(
    (child) => child.urn.split(":")[2] === "terrain"
  )?.key;

  return await Forma.geometry.getTriangles({ path: `root/${terrainKey}` });
}

export async function getSceneVertexPositions(): Promise<Float32Array> {
  const excludedPaths = await Forma.geometry.getPathsForVirtualElements();
  return Forma.geometry.getTriangles({ excludedPaths: excludedPaths });
}

export async function getSelectedElementsByType(paths: string[]): Promise<{
  areaElements: { path: string; urn: Urn }[];
  volumeElements: { path: string; urn: Urn }[];
}> {
  const selectedElements = await Promise.all(
    paths.map((path) =>
      Forma.elements
        .getByPath({ path, recursive: true })
        .then((e) => ({ path, ...e }))
    )
  );

  function representationExistsInHierarchy(
    element: FormaElement,
    otherElements: ElementResponse,
    representation: string,
    ignoreCategories?: string[]
  ): boolean {
    if (ignoreCategories?.includes(element.properties?.category ?? "")) {
      return false;
    }
    if (Object.keys(element.representations || {}).includes(representation)) {
      return true;
    }

    return (
      element.children?.some((child: Child) =>
        representationExistsInHierarchy(
          otherElements[child.urn],
          otherElements,
          representation,
          ignoreCategories
        )
      ) || false
    );
  }

  const volumeElements = selectedElements
    .filter((e) =>
      representationExistsInHierarchy(e.element, e.elements, "volumeMesh", [
        "vegetation",
      ])
    )
    .map((e) => ({ path: e.path, urn: e.element.urn as Urn }));
  const areaElements = selectedElements
    .filter((e) => !volumeElements.map((ve) => ve.path).includes(e.path))
    .filter((e) =>
      representationExistsInHierarchy(e.element, e.elements, "footprint")
    )
    .map((e) => ({ path: e.path, urn: e.element.urn as Urn }));

  return { areaElements, volumeElements };
}

/**
 * This function takes a list of paths and replaces all paths that are floors with their parent paths
 */
export async function getPathsForScene(paths: string[]) {
  const scenePaths: string[] = [];

  await Promise.all(
    paths.map(async (path) => {
      const { element } = await Forma.elements.getByPath({ path });
      if (element.properties?.category === "floor") {
        const parentPath = path.split("/").slice(0, -1).join("/");
        scenePaths.push(parentPath);
      } else {
        scenePaths.push(path);
      }
    })
  );

  // remove duplicates
  return Array.from(new Set(scenePaths));
}

export function getVisibilityLevel(coverage: number) {
  if (coverage > 0.9) return "Complete";
  if (coverage > 0.5) return "High";
  if (coverage > 0.1) return "Medium";
  if (coverage > 0) return "Low";
  return "None";
}

export function getVisibilityColor(visibilityLevel: string) {
  switch (visibilityLevel) {
    case "Complete":
      return "#9BD5EF";
    case "High":
      return "#38ABDF";
    case "Medium":
      return "#007FC6";
    case "Low":
      return "#074B78";
    default:
      return "#0A324D";
  }
}

export function parseAnalysisResult(result: number[]) {
  const res: { [key: string]: number } = {};

  result.forEach((value) => {
    const key = getVisibilityLevel(value);
    if (res[key] === undefined) {
      res[key] = 1;
    } else {
      res[key] += 1;
    }
  });

  const ratio = Object.keys(res).map((key) => {
    return {
      ratio: res[key] / result.length,
      color: getVisibilityColor(key),
      text: key,
    };
  });

  const order = ["Complete", "High", "Medium", "Low", "None"];

  ratio.sort((a, b) => order.indexOf(a.text) - order.indexOf(b.text));

  return ratio;
}
