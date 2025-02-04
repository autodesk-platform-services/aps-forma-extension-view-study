# View Analysis Extension for Autodesk Forma

This extension is built using the Forma SDK as an Embedded View on the right menu analysis panel. The public extension id for this extension is **EXT_ID**.

- [Motivation](#motivation)
- [Usage](#usage)
  - [View from geometry](#view-from-geometry)
  - [View from point](#view-from-point)
- [Using the Forma SDK](#using-the-forma-sdk)
  - [Subscribe to scene selection changes](#subscribe-to-scene-selection-changes)
  - [Color elements](#color-elements)
  - [Retrieve Forma Element by path](#retrieve-forma-element-by-path)
  - [Get three.js Mesh from path](#get-threejs-mesh-from-path)
  - [Draw three.js Group to scene](#draw-threejs-group-to-scene)
  - [Remove all GLB's added with SDK](#remove-all-glbs-added-with-sdk)
  - [Draw three.js Line between two points in scene](#draw-threejs-line-between-two-points-in-scene)
- [Behind the analysis](#behind-the-analysis)
- [Styling](#styling)
- [Local development](#local-development)
- [Deployment and hosting](#deployment-and-hosting)

## Motivation

The extension offers Autodesk Forma users two types of view analysis:

- analysis of the view from a certain point to selected volumes (buildings etc.) or areas (zones, vegetation),
- analysis of the view from volumes/areas to a volume

This extension was also developed to demonstrate the capabilities of the [forma-embedded-view-sdk](http://github.com/spacemakerai/forma-embedded-view-sdk).

## Usage

#### View from geometry

- **Select target geometry.** While the "Target geometry" selection mode is toggled, click on a building, zone, vegetation area, or any other supported geometry to select it for analysis.
  It is possible to select several geometries at once. Once the geometry is selected, the preview measurement points of this geometry is highlighted in the scene.
- **Select source geometry.** Toggle the selection mode to "Source geometry". While in this selection mode, click on a building, floor, or any other supported geometry to select it for analysis.
  When a source geometry is selected, the geometry will be highlighted in the scene.
- **Run analysis.** The analysis begins automatically when both target- and source geometry are selected in the scene. This analysis may take a few seconds to complete.
  When the analysis is complete, the result will be visualized in the scene along with statistics being shown in the extension panel.
- **Change tracing density.** Optionally, you can change the tracing density of the analysis by clicking the settings-icon. The options are `High`, `Medium` and `Low`.
  Lower tracing density will reduce the time the analysis takes to complete, but the accuracy can be affected.

https://github.com/user-attachments/assets/92483ecd-0b45-43e0-ad9b-748568f5c103

#### View from point

- **Select target geometry.** While the "Target geometry" selection mode is toggled, click on a building, zone, vegetation area or any other supported geometry to select it for analysis.
  It is possible to select several geometries at once. Once the geometry is selected, the preview measurement points of this geometry is highlighted in the scene.
- **Select source point.** Toggle the selection mode to "Source point". While in this selection mode, you can click on a point in the scene to select it for analysis. When a source point is selected, the source point will be highlighted in the scene.
  **To cancel source point selection (toggle selection mode to "Target geometry"), Press Esc on your keyboard.**
- **Run analysis.** The analysis begins automatically when both target geometry and source point are selected in the scene. The results of the analysis will be visualized in the scene along with statistics being shown in the extension panel.
- **Change tracing density.** Optionally, you can change the tracing density of the analysis by clicking the settings-icon. The options are `High`, `Medium` and `Low`.
  Lower tracing density will reduce the time the analysis takes to complete, but the accuracy can be affected.
- **Show view lines.** You can visualize the view lines between the source point and the visible measurement points on the target geometry by toggling this option in the settings.

https://github.com/user-attachments/assets/fc997686-2197-4793-a290-dfcd3b62cd62

## Using the Forma SDK

#### Subscribe to scene selection changes

Stores the paths of the selected elements in the scene in a preact signal.
https://app.autodeskforma.com/forma-embedded-view-sdk/docs/classes/scene_selection.SelectionApi.html#subscribe

```ts
import { signal } from "@preact/signals";
import { Forma } from "forma-embedded-view-sdk/auto";

export const currentSelectionState = signal<string[]>([]);

/** Subscribe the the current selection from Forma */
Forma.selection.subscribe(({ paths }) => {
  currentSelectionState.value = paths;
});
```

#### Color elements

https://app.autodeskforma.com/forma-embedded-view-sdk/docs/classes/render.ElementColorApi.html

```ts
async function colorElements(paths: string[]) {
  // Clear already colored elements
  await Forma.render.elementColors.clearAll();

  const sourceColor = "#5599FF";
  const pathsToColor = new Map<string, string>();
  paths.forEach((path) => pathsToColor.set(path, sourceColor));
  await Forma.render.elementColors.set({ pathsToColor });
}
```

#### Retrieve Forma Element by path

https://app.autodeskforma.com/forma-embedded-view-sdk/docs/classes/elements.ElementsApi.html#getByPath

```ts
// Get the Forma Element for the first selected element
const { element } = await Forma.elements.getByPath({
  path: currentSelectionState.value[0],
});
```

#### Get three.js Mesh from path

https://app.autodeskforma.com/forma-embedded-view-sdk/docs/classes/geometry.GeometryApi.html#getTriangles

```ts
const triangles = await Forma.geometry.getTriangles({ path });

const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.computeBoundsTree();

const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
```

#### Draw three.js Group to scene

https://app.autodeskforma.com/forma-embedded-view-sdk/docs/classes/render.RenderGlbApi.html#add

```ts
async function drawGroupToFormaScene(group: THREE.Group) {
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
  // Parse scene to glb
  const gltf = await exporter.parseAsync(resultScene, { binary: true });
  if (gltf instanceof ArrayBuffer) {
    const { id } = await Forma.render.glb.add({
      glb: gltf as ArrayBuffer,
    });
  }
}
```

#### Remove all GLB's added with SDK

https://app.autodeskforma.com/forma-embedded-view-sdk/docs/classes/render.RenderGlbApi.html#remove

```ts
await Forma.render.glb.cleanup();
```

#### Draw three.js Line between two points in scene

```ts
const from = new THREE.Vector3(1, 1, 1);
const to = new THREE.Vector3(1, 1, 100);

const group = new THREE.Group();
const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
const line = new THREE.Line(geometry, material);
group.add(line);

drawGroupToFormaScene(group);
```

## Behind the analysis

This extension uses **raycasting** with the `three-mesh-bvh` plugin in `three.js` together with geometry from the Forma API to determine visibility between source and target geometries. The use of `three-mesh-bvh` [greatly improves raycasting performance](https://discourse.threejs.org/t/three-mesh-bvh-a-plugin-for-fast-geometry-raycasting-and-spatial-queries/26394) for our analysis.

Example on how raycasting between two points can be performed:

```ts
import * as THREE from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
import { computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";

// Speed up raycasting using https://github.com/gkjohnson/three-mesh-bvh
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

THREE.Mesh.prototype.raycast = acceleratedRaycast;
const raycaster = new THREE.Raycaster();
// For this analysis we only need the first hit, which is faster to compute
// @ts-ignore
raycaster.firstHitOnly = true;

const firstNonZero = (intersections: THREE.Intersection[]) =>
  intersections.find((intersection) => intersection.distance > 0);

// This function assumes that the to-point lies on a surface, otherwise the raycaster
// will just pass through this point without intersecting anything.
function raycastHit(
  from: THREE.Vector3,
  to: THREE.Vector3, // Point on a surface
  scene: THREE.Scene
) {
  const direction = to.clone().sub(from);

  // Slightly move the from-point towards the to-point to avoid the from-point from
  // intersecting with geometry it lies on
  const slightlyMovedSourcePoint = from
    .clone()
    .addScaledVector(direction.clone().normalize(), 0.001);

  // Perform the raycasting
  raycaster.set(slightlyMovedSourcePoint, direction);
  const intersections = raycaster.intersectObjects(scene.children);

  // Get first intersection
  const intersection = firstNonZero(intersections);

  // Check if distance of intersection and computed direction is the same within small threshold
  const canSee =
    Math.abs((intersection?.distance ?? 0) - direction.length()) < 0.003;

  return canSee && intersection;
}
```

## Styling

In order to achieve consistent styling with the rest of the Forma app, we utilise web components from the [Autodesk Forma Design System](https://app.autodeskforma.eu/design-system/v2/docs/).
Follow the link to access a Storybook with extensive overview of available components and examples of usage.

Excerpt of the used components included in `index.html`:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="./src/index.css" />
  <link
    rel="stylesheet"
    href="https://app.autodeskforma.com/design-system/v2/forma/styles/base.css"
  />
  <script
    type="module"
    src="https://app.autodeskforma.com/design-system/v2/weave/components/progress-bar/weave-progress-bar.js"
  ></script>
  <script
    type="module"
    src="https://app.autodeskforma.com/design-system/v2/weave/components/button/weave-button.js"
  ></script>
  <script
    type="module"
    src="https://app.autodeskforma.com/design-system/v2/weave/components/dropdown/weave-select.js"
  ></script>
  <script
    type="module"
    src="https://app.autodeskforma.com/design-system/v2/weave/components/input/weave-input.js"
  ></script>
  <script
    type="module"
    src="https://app.autodeskforma.eu/design-system/v2/forma/components/horizontalbarchart/forma-horizontalbarchart.js"
  ></script>
  <!-- Ommited modules... -->
  <title>Forma View Analysis</title>
</head>
```

Extension-specific styling is found in `src/index.css`, while `src/lib/weave.d.ts` hold type declarations to enable working with the relevant web components in typescript:

```ts
import { ComponentChildren, JSXIn } from "preact";

declare global {
  namespace JSX {
    interface IntrinsicElements JSX.HTMLAttributes<HTMLElement> & {
      "weave-button": {
        disabled?: boolean;
        onClick?: () => void;
        children?: ComponentChildren;
        style?: string;
        variant: "outlined" | "solid" | "flat";
      };
      "weave-select": JSX.HTMLAttributes<HTMLElement> & {
        placeholder?: string;
        onChange?: (e: CustomEvent) => void;
        children?: ComponentChildren;
        style?: string;
        value?: string;
      };
      "weave-select-option": JSX.HTMLAttributes<HTMLElement> & {
        children?: ComponentChildren;
        style?: string;
        key?: string;
        value: string;
      };
      "weave-input": JSX.HTMLAttributes<HTMLElement> & {
        children?: ComponentChildren;
        onChange?: (e: CustomEvent) => void;
        style?: string;
        label?: string;
        disabled?: boolean;
        type?: string;
        value?: string;
        unit?: string;
        variant?: string;
        step?: string;
      };
      "forma-horizontalbarchart": JSX.HTMLAttributes<HTMLElement> & {
        chartData?: {
          key: string;
          label: string;
          value?: number;
          percent: number;
          color: string;
        }[];
        valueheader?: string;
        labelheader?: string;
        showtotal?: boolean;
        precisionpercent?: number;
        precisionvalue?: number;
      };
      // Omitted...
    }
  }
}
```

## Local development

This repository uses `pnpm` as package manger. `pnpm run dev` will start a local development server that will serve the extension on `http://localhost:5173`.

Set up an extension in Forma to load `http://localhost:5173` as the extension URL. We recommend using the **RIGHT_MENU_ANALYSIS_PANEL** placement for this extension.

## Deployment and hosting

This extension is updated using continuous integration and deployment. In practice, each commit to the `main` branch of this repo triggers [GitHub Actions](https://docs.github.com/en/actions) to build the static files, upload them to [GitHub pages](https://pages.github.com/) and finally deploy the changes so that the update reaches end users within a minute of the commit.

Check out the workflows in `.github/workflows/buildanddeploy.yaml` to learn more about how this has been configured -- it constitutes a simple example of how to do CI/CD to get you started if you want to do something similar.
