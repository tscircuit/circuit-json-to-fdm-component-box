import { getScaledLabelMetrics } from "./label-text"

const compactNumericRange = (refdes: readonly string[]): string | undefined => {
  const parsed = refdes.map((value) => {
    const match = /^(.*?)(\d+)$/.exec(value)
    return match ? { prefix: match[1]!, number: Number(match[2]) } : undefined
  })
  if (parsed.some((value) => !value)) return undefined
  const values = parsed as Array<{ prefix: string; number: number }>
  const prefix = values[0]!.prefix
  if (values.some((value) => value.prefix !== prefix)) return undefined

  const ranges: Array<{ start: number; end: number }> = []
  for (const number of [...new Set(values.map((value) => value.number))].sort(
    (a, b) => a - b,
  )) {
    const previous = ranges[ranges.length - 1]
    if (previous && number === previous.end + 1) previous.end = number
    else ranges.push({ start: number, end: number })
  }
  return ranges
    .map(({ start, end }) =>
      start === end ? `${prefix}${start}` : `${prefix}${start}-${end}`,
    )
    .join(",")
}

const middleAbbreviations = (value: string): string[] => {
  const abbreviations: string[] = []
  for (let kept = value.length - 1; kept >= 2; kept -= 1) {
    const startLength = Math.ceil(kept / 2)
    const endLength = Math.floor(kept / 2)
    abbreviations.push(
      `${value.slice(0, startLength)}...${value.slice(value.length - endLength)}`,
    )
  }
  return abbreviations
}

const tokenAbbreviations = (value: string): string[] => {
  const count = /\+\d+$/.exec(value)?.[0] ?? ""
  const refdes = count ? value.slice(0, -count.length) : value
  const tokens = refdes.split("_")
  if (tokens.length < 2) return []

  const separated = [4, 3, 2, 1].map((charactersPerToken) =>
    [
      tokens[0],
      ...tokens.slice(1).map((token) => token.slice(0, charactersPerToken)),
    ]
      .join("_")
      .concat(count),
  )
  const condensed = [3, 2, 1].map((charactersPerToken) =>
    [
      tokens[0],
      ...tokens.slice(1).map((token) => token.slice(0, charactersPerToken)),
    ]
      .join("")
      .concat(count),
  )
  return [...separated, ...condensed]
}

export const formatComponentGroupLabel = (
  referenceDesignators: readonly string[],
  options: {
    availableWidth: number
    availableHeight: number
    minimumStrokeWidth: number
  },
): string => {
  const full = referenceDesignators.join(",")
  const compact = compactNumericRange(referenceDesignators)
  const counted =
    referenceDesignators.length > 1
      ? `${referenceDesignators[0]}+${referenceDesignators.length - 1}`
      : referenceDesignators[0]!
  const candidates = [
    ...new Set(
      [full, compact, counted].filter((candidate): candidate is string =>
        Boolean(candidate),
      ),
    ),
  ]
  candidates.push(...tokenAbbreviations(counted))
  candidates.push(...middleAbbreviations(counted))

  for (const candidate of candidates) {
    const { strokeWidth } = getScaledLabelMetrics(
      candidate,
      options.availableWidth,
      options.availableHeight,
    )
    if (strokeWidth >= options.minimumStrokeWidth) return candidate
  }

  const { strokeWidth } = getScaledLabelMetrics(
    counted,
    options.availableWidth,
    options.availableHeight,
  )
  throw new Error(
    `Refdes group ${JSON.stringify(referenceDesignators)} needs a ${strokeWidth.toFixed(3)}mm text stroke, below minimumLabelStrokeWidth ${options.minimumStrokeWidth}mm; increase compartmentWidth or labelBandDepth`,
  )
}
