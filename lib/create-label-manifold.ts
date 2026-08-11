import outlinePolygons from "@tscircuit/alphabet/outline-polygons"
import {
  glyphAdvanceRatio,
  kerningRatio,
  spaceWidthRatio,
  textMetrics,
} from "@tscircuit/alphabet"
import type { Manifold, ManifoldToplevel, Polygons } from "manifold-3d"
import type {
  CompartmentPlacement,
  ResolvedFdmComponentBoxOptions,
} from "./types"

interface Point {
  x: number
  y: number
}

const pointsMatch = (a: Point, b: Point): boolean =>
  Math.abs(a.x - b.x) < 1e-12 && Math.abs(a.y - b.y) < 1e-12

const getTextContours = (text: string): Point[][] => {
  const contours: Point[][] = []
  let cursorX = 0
  let previousCharacter: string | undefined

  for (const character of text) {
    if (character === " ") {
      cursorX += spaceWidthRatio
      previousCharacter = character
      continue
    }

    const glyph = outlinePolygons[character]
    if (!glyph) {
      throw new Error(
        `Refdes ${JSON.stringify(text)} contains unsupported label character ${JSON.stringify(character)}`,
      )
    }

    cursorX += previousCharacter
      ? (kerningRatio[previousCharacter]?.[character] ?? 0)
      : 0

    for (const ring of glyph) {
      const unclosedRing =
        ring.length > 1 && pointsMatch(ring[0]!, ring[ring.length - 1]!)
          ? ring.slice(0, -1)
          : ring
      contours.push(unclosedRing.map(({ x, y }) => ({ x: x + cursorX, y })))
    }

    cursorX += glyphAdvanceRatio[character] ?? spaceWidthRatio
    previousCharacter = character
  }

  if (contours.length === 0) {
    throw new Error(`Refdes ${JSON.stringify(text)} has no printable glyphs`)
  }

  return contours
}

const getBounds = (contours: readonly Point[][]) => {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const ring of contours) {
    for (const point of ring) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }

  return { minX, minY, maxX, maxY }
}

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
  const contours = getTextContours(placement.refdes)
  const bounds = getBounds(contours)
  const rawWidth = bounds.maxX - bounds.minX
  const rawHeight = bounds.maxY - bounds.minY
  const availableWidth = options.compartmentWidth - options.labelPadding * 2
  const availableHeight = options.labelBandDepth - options.labelPadding * 2
  const scale = Math.min(availableWidth / rawWidth, availableHeight / rawHeight)
  const strokeWidth = textMetrics.strokeWidthRatio * scale

  if (strokeWidth < options.minimumLabelStrokeWidth) {
    throw new Error(
      `Refdes ${JSON.stringify(placement.refdes)} needs a ${strokeWidth.toFixed(3)}mm text stroke, below minimumLabelStrokeWidth ${options.minimumLabelStrokeWidth}mm; increase compartmentWidth or labelBandDepth`,
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
