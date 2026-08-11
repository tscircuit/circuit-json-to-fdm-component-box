import type { CircuitJson } from "circuit-json"
import { buildFdmComponentBox } from "./build-fdm-component-box"
import { createThreeMf } from "./create-three-mf"
import type { FdmComponentBoxOptions, FdmComponentBoxResult } from "./types"

export const createFdmComponentBox = async (
  circuitJson: CircuitJson,
  options: FdmComponentBoxOptions = {},
): Promise<FdmComponentBoxResult> => {
  const built = await buildFdmComponentBox(circuitJson, options)
  const boxTriangles = built.meshes.box.triangles.length / 3
  const labelTriangles = built.meshes.labels.reduce(
    (sum, mesh) => sum + mesh.triangles.length / 3,
    0,
  )

  return {
    threeMf: createThreeMf({
      box: built.meshes.box,
      labels: built.meshes.labels,
      boxColor: built.options.boxColor,
      labelColor: built.options.labelColor,
      title: built.options.title,
    }),
    componentRefdes: built.componentRefdes,
    componentGroups: built.componentGroups,
    dimensions: built.dimensions,
    compartments: built.compartments,
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
