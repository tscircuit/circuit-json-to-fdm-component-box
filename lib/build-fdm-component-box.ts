import type { CircuitJson } from "circuit-json"
import {
  extractComponentGroups,
  naturalRefdesCollator,
} from "./extract-component-groups"
import { createPrintableMeshes, type PrintableMesh } from "./manifold-meshes"
import { resolveFdmComponentBoxOptions } from "./resolve-options"
import type {
  ComponentGroup,
  CompartmentPlacement,
  FdmComponentBoxDimensions,
  FdmComponentBoxOptions,
  ResolvedFdmComponentBoxOptions,
} from "./types"

export interface BuiltFdmComponentBox {
  componentGroups: ComponentGroup[]
  componentRefdes: string[]
  options: ResolvedFdmComponentBoxOptions
  dimensions: FdmComponentBoxDimensions
  compartments: CompartmentPlacement[]
  meshes: { box: PrintableMesh; labels: PrintableMesh[] }
}

export const buildFdmComponentBox = async (
  circuitJson: CircuitJson,
  options: FdmComponentBoxOptions = {},
): Promise<BuiltFdmComponentBox> => {
  const componentGroups = extractComponentGroups(circuitJson, {
    includeUnplacedComponents: options.includeUnplacedComponents,
    includeTestPoints: options.includeTestPoints,
    groupByComponent: options.groupByComponent,
  })
  const resolved = resolveFdmComponentBoxOptions(componentGroups, options)
  const meshes = await createPrintableMeshes(
    resolved.options,
    resolved.dimensions,
    resolved.compartments,
  )

  return {
    componentGroups,
    componentRefdes: componentGroups
      .flatMap(({ referenceDesignators }) => referenceDesignators)
      .sort((a, b) => naturalRefdesCollator.compare(a, b)),
    options: resolved.options,
    dimensions: resolved.dimensions,
    compartments: resolved.compartments,
    meshes,
  }
}
