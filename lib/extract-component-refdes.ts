import type { CircuitJson } from "circuit-json"

interface CircuitRecord {
  type?: unknown
  name?: unknown
  source_component_id?: unknown
  do_not_place?: unknown
}

const naturalRefdesCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
})

const asCircuitRecord = (value: unknown): CircuitRecord | undefined => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined
  }

  return value as CircuitRecord
}

/**
 * Returns the physical component refdes values that should receive pockets.
 *
 * When the document contains pcb_component records, unplaced source components
 * are omitted by default. Source-only Circuit JSON falls back to all source
 * components so partially rendered documents remain useful.
 */
export const extractComponentRefdes = (
  circuitJson: CircuitJson,
  options: { includeUnplacedComponents?: boolean } = {},
): string[] => {
  if (!Array.isArray(circuitJson)) {
    throw new TypeError("Circuit JSON must be an array")
  }

  const sourceComponents: Array<{ id: string; refdes: string }> = []
  const placedSourceComponentIds = new Set<string>()
  let hasPcbComponents = false

  for (const element of circuitJson as readonly unknown[]) {
    const record = asCircuitRecord(element)
    if (!record) continue

    if (record.type === "source_component") {
      if (
        typeof record.source_component_id !== "string" ||
        record.source_component_id.trim() === "" ||
        typeof record.name !== "string" ||
        record.name.trim() === ""
      ) {
        throw new TypeError(
          "Every source_component must have non-empty source_component_id and name fields",
        )
      }

      sourceComponents.push({
        id: record.source_component_id,
        refdes: record.name.trim(),
      })
    }

    if (record.type === "pcb_component") {
      hasPcbComponents = true
      if (
        record.do_not_place !== true &&
        typeof record.source_component_id === "string"
      ) {
        placedSourceComponentIds.add(record.source_component_id)
      }
    }
  }

  const shouldFilterUnplaced =
    !options.includeUnplacedComponents && hasPcbComponents
  const selected = shouldFilterUnplaced
    ? sourceComponents.filter(({ id }) => placedSourceComponentIds.has(id))
    : sourceComponents

  if (selected.length === 0) {
    throw new Error(
      shouldFilterUnplaced
        ? "Circuit JSON has no source components linked to pcb_component records"
        : "Circuit JSON has no source components to place in compartments",
    )
  }

  const duplicateRefdes = selected
    .map(({ refdes }) => refdes)
    .find((refdes, index, all) => all.indexOf(refdes) !== index)
  if (duplicateRefdes) {
    throw new Error(`Duplicate component refdes: ${duplicateRefdes}`)
  }

  return selected
    .map(({ refdes }) => refdes)
    .sort((a, b) => naturalRefdesCollator.compare(a, b))
}
