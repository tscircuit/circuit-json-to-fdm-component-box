import type { CircuitJson } from "circuit-json"
import { createPrintableMeshes } from "./manifold-meshes"
import { extractComponentRefdes } from "./extract-component-refdes"
import { resolveFdmComponentBoxOptions } from "./resolve-options"
import { createThreeMf } from "./create-three-mf"
import type { FdmComponentBoxOptions, FdmComponentBoxResult } from "./types"

export const createFdmComponentBox = async (
  circuitJson: CircuitJson,
  options: FdmComponentBoxOptions = {},
): Promise<FdmComponentBoxResult> => {
  const componentRefdes = extractComponentRefdes(circuitJson, {
    includeUnplacedComponents: options.includeUnplacedComponents,
  })
  const resolved = resolveFdmComponentBoxOptions(componentRefdes, options)
  const meshes = await createPrintableMeshes(
    resolved.options,
    resolved.dimensions,
    resolved.compartments,
  )
  const boxTriangles = meshes.box.triangles.length / 3
  const labelTriangles = meshes.labels.reduce(
    (sum, mesh) => sum + mesh.triangles.length / 3,
    0,
  )

  return {
    threeMf: createThreeMf({
      box: meshes.box,
      labels: meshes.labels,
      boxColor: resolved.options.boxColor,
      labelColor: resolved.options.labelColor,
      title: resolved.options.title,
    }),
    componentRefdes,
    dimensions: resolved.dimensions,
    compartments: resolved.compartments,
    meshStats: {
      boxTriangles,
      labelTriangles,
      totalTriangles: boxTriangles + labelTriangles,
    },
  }
}

/** Convert Circuit JSON directly to a ready-to-write 3MF byte array. */
export const circuitJsonToFdmComponentBox = async (
  circuitJson: CircuitJson,
  options: FdmComponentBoxOptions = {},
): Promise<Uint8Array> =>
  (await createFdmComponentBox(circuitJson, options)).threeMf
