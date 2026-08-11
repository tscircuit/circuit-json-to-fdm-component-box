import outlinePolygons from "@tscircuit/alphabet/outline-polygons"
import {
  glyphAdvanceRatio,
  kerningRatio,
  spaceWidthRatio,
  textMetrics,
} from "@tscircuit/alphabet"

export interface LabelPoint {
  x: number
  y: number
}

export interface LabelTextGeometry {
  contours: LabelPoint[][]
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  rawWidth: number
  rawHeight: number
}

const pointsMatch = (a: LabelPoint, b: LabelPoint): boolean =>
  Math.abs(a.x - b.x) < 1e-12 && Math.abs(a.y - b.y) < 1e-12

export const getLabelTextGeometry = (text: string): LabelTextGeometry => {
  const contours: LabelPoint[][] = []
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
        `Label ${JSON.stringify(text)} contains unsupported character ${JSON.stringify(character)}`,
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
    throw new Error(`Label ${JSON.stringify(text)} has no printable glyphs`)
  }

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

  return {
    contours,
    bounds: { minX, minY, maxX, maxY },
    rawWidth: maxX - minX,
    rawHeight: maxY - minY,
  }
}

export const getScaledLabelMetrics = (
  text: string,
  availableWidth: number,
  availableHeight: number,
): LabelTextGeometry & { scale: number; strokeWidth: number } => {
  const geometry = getLabelTextGeometry(text)
  const scale = Math.min(
    availableWidth / geometry.rawWidth,
    availableHeight / geometry.rawHeight,
  )
  return {
    ...geometry,
    scale,
    strokeWidth: textMetrics.strokeWidthRatio * scale,
  }
}
