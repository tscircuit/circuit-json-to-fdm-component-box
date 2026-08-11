import type { Manifold, ManifoldToplevel, Polygons } from "manifold-3d"
import { getScaledLabelMetrics } from "./label-text"
import type {
  CompartmentPlacement,
  ResolvedFdmComponentBoxOptions,
} from "./types"

/**
 * Builds a raised vector label in the box coordinate frame (millimetres,
 * right-handed, +Z up). The label starts exactly on the box rim so slicers can
 * assign it to a second material without a floating or overlapping volume.
 */
export const createLabelManifold = (
  module: ManifoldToplevel,
  placement: CompartmentPlacement,
  options: ResolvedFdmComponentBoxOptions,
  boxHeight: number,
): Manifold => {
  const availableWidth = options.compartmentWidth - options.labelPadding * 2
  const availableHeight = options.labelBandDepth - options.labelPadding * 2
  const { contours, bounds, rawWidth, rawHeight, scale, strokeWidth } =
    getScaledLabelMetrics(placement.label, availableWidth, availableHeight)

  if (strokeWidth < options.minimumLabelStrokeWidth) {
    throw new Error(
      `Label ${JSON.stringify(placement.label)} needs a ${strokeWidth.toFixed(3)}mm text stroke, below minimumLabelStrokeWidth ${options.minimumLabelStrokeWidth}mm; increase compartmentWidth or labelBandDepth`,
    )
  }

  const scaledWidth = rawWidth * scale
  const scaledHeight = rawHeight * scale
  const offsetX =
    placement.labelCenter.x - scaledWidth / 2 - bounds.minX * scale
  const offsetY =
    placement.labelCenter.y - scaledHeight / 2 - bounds.minY * scale
  const transformedContours: Polygons = contours.map((ring) =>
    ring.map(
      ({ x, y }) =>
        [x * scale + offsetX, y * scale + offsetY] as [number, number],
    ),
  )

  const crossSection = module.CrossSection.ofPolygons(
    transformedContours,
    "Positive",
  )
  let unpositioned: Manifold | undefined

  try {
    unpositioned = crossSection.extrude(options.labelThickness)
    return unpositioned.translate([0, 0, boxHeight])
  } finally {
    unpositioned?.delete()
    crossSection.delete()
  }
}
