import ManifoldModule, {
  type Manifold,
  type ManifoldToplevel,
  type Mesh,
} from "manifold-3d"
import { createLabelManifold } from "./create-label-manifold"
import type {
  CompartmentPlacement,
  FdmComponentBoxDimensions,
  ResolvedFdmComponentBoxOptions,
} from "./types"

export interface PrintableMesh {
  name: string
  vertices: Float32Array
  triangles: Uint32Array
  materialIndex: number
}

let manifoldModulePromise: Promise<ManifoldToplevel> | undefined

const getManifoldModule = async (): Promise<ManifoldToplevel> => {
  manifoldModulePromise ??= ManifoldModule().then((module) => {
    module.setup()
    return module
  })
  return manifoldModulePromise
}

const copyMesh = (
  mesh: Mesh,
  name: string,
  materialIndex: number,
): PrintableMesh => {
  const vertices = new Float32Array(mesh.numVert * 3)
  for (let vertexIndex = 0; vertexIndex < mesh.numVert; vertexIndex += 1) {
    const sourceOffset = vertexIndex * mesh.numProp
    const destinationOffset = vertexIndex * 3
    vertices[destinationOffset] = mesh.vertProperties[sourceOffset]!
    vertices[destinationOffset + 1] = mesh.vertProperties[sourceOffset + 1]!
    vertices[destinationOffset + 2] = mesh.vertProperties[sourceOffset + 2]!
  }

  return {
    name,
    vertices,
    triangles: new Uint32Array(mesh.triVerts),
    materialIndex,
  }
}

const deleteAll = (manifolds: readonly Manifold[]): void => {
  for (const manifold of manifolds) manifold.delete()
}

export const createPrintableMeshes = async (
  options: ResolvedFdmComponentBoxOptions,
  dimensions: FdmComponentBoxDimensions,
  compartments: readonly CompartmentPlacement[],
): Promise<{ box: PrintableMesh; labels: PrintableMesh[] }> => {
  const module = await getManifoldModule()
  const { Manifold } = module
  const rowSolids: Manifold[] = []
  const cavitySolids: Manifold[] = []
  const labelSolids: Manifold[] = []
  let outer: Manifold | undefined
  let cavityUnion: Manifold | undefined
  let box: Manifold | undefined

  try {
    const rowInnerDepth = options.compartmentDepth + options.labelBandDepth
    const rowPitch = rowInnerDepth + options.wallThickness

    for (let row = 0; row < dimensions.rows; row += 1) {
      const rowCellCount = Math.min(
        options.columns,
        compartments.length - row * options.columns,
      )
      const rowWidth =
        rowCellCount * options.compartmentWidth +
        (rowCellCount + 1) * options.wallThickness
      rowSolids.push(
        Manifold.cube([
          rowWidth,
          rowInnerDepth + options.wallThickness * 2,
          dimensions.height,
        ]).translate([0, row * rowPitch, 0]),
      )
    }

    for (const compartment of compartments) {
      const cavityX = compartment.center.x - options.compartmentWidth / 2
      const cavityY = compartment.center.y - options.compartmentDepth / 2
      cavitySolids.push(
        Manifold.cube([
          options.compartmentWidth,
          options.compartmentDepth,
          options.compartmentHeight + 0.1,
        ]).translate([cavityX, cavityY, options.floorThickness]),
      )
    }

    outer = Manifold.union(rowSolids)
    cavityUnion = Manifold.union(cavitySolids)
    box = outer.subtract(cavityUnion)

    if (box.isEmpty() || box.status() !== "NoError") {
      throw new Error(`manifold-3d could not create the box: ${box.status()}`)
    }

    const boxMesh = copyMesh(box.getMesh(), "Box", 0)
    const labelMeshes: PrintableMesh[] = []

    for (const compartment of compartments) {
      const label = createLabelManifold(
        module,
        compartment,
        options,
        dimensions.height,
      )
      labelSolids.push(label)

      if (label.isEmpty() || label.status() !== "NoError") {
        throw new Error(
          `manifold-3d could not create label ${compartment.refdes}: ${label.status()}`,
        )
      }

      labelMeshes.push(
        copyMesh(
          label.getMesh(),
          `Label ${compartment.referenceDesignators.join(",")}`,
          1,
        ),
      )
    }

    return { box: boxMesh, labels: labelMeshes }
  } finally {
    box?.delete()
    cavityUnion?.delete()
    outer?.delete()
    deleteAll(labelSolids)
    deleteAll(cavitySolids)
    deleteAll(rowSolids)
  }
}
