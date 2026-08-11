import type { CircuitJson } from "circuit-json"
import type { ComponentGroup } from "./types"

interface CircuitRecord extends Record<string, unknown> {
  type?: unknown
  name?: unknown
  source_component_id?: unknown
  pcb_component_id?: unknown
  do_not_place?: unknown
  ftype?: unknown
  manufacturer_part_number?: unknown
  supplier_part_numbers?: unknown
  footprinter_string?: unknown
  width?: unknown
  height?: unknown
}

interface SelectedComponent {
  source: CircuitRecord & {
    source_component_id: string
    name: string
  }
  footprint?: string
  physicalSize?: string
}

export interface ExtractComponentGroupsOptions {
  includeUnplacedComponents?: boolean
  includeTestPoints?: boolean
  groupByComponent?: boolean
}

export const naturalRefdesCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
})

const asCircuitRecord = (value: unknown): CircuitRecord | undefined => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined
  }
  return value as CircuitRecord
}

const normalizeIdentity = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toUpperCase()

const getSupplierPartNumbers = (
  value: unknown,
): Record<string, string[]> | undefined => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined
  }

  const entries: Array<[string, string[]]> = []
  for (const [supplier, partNumbers] of Object.entries(value)) {
    if (!Array.isArray(partNumbers)) continue
    const normalized = partNumbers
      .filter(
        (partNumber): partNumber is string => typeof partNumber === "string",
      )
      .map((partNumber) => partNumber.trim())
      .filter(Boolean)
    if (normalized.length > 0) entries.push([supplier, normalized])
  }
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

const supplierPriority = [
  "jlcpcb",
  "lcsc",
  "digikey",
  "mouser",
  "pcbway",
  "macrofab",
]

const getPreferredSupplierIdentity = (
  supplierPartNumbers: Record<string, string[]> | undefined,
): string | undefined => {
  if (!supplierPartNumbers) return undefined
  const suppliers = Object.keys(supplierPartNumbers).sort((a, b) => {
    const aPriority = supplierPriority.indexOf(a.toLowerCase())
    const bPriority = supplierPriority.indexOf(b.toLowerCase())
    return (
      (aPriority < 0 ? Number.POSITIVE_INFINITY : aPriority) -
        (bPriority < 0 ? Number.POSITIVE_INFINITY : bPriority) ||
      a.localeCompare(b)
    )
  })
  const supplier = suppliers[0]
  const partNumber = supplier ? supplierPartNumbers[supplier]?.[0] : undefined
  return supplier && partNumber
    ? `supplier:${supplier.toLowerCase()}:${normalizeIdentity(partNumber)}`
    : undefined
}

const getPassiveValue = (source: CircuitRecord): unknown => {
  switch (source.ftype) {
    case "simple_resistor":
      return source.resistance
    case "simple_capacitor":
      return source.capacitance
    case "simple_inductor":
      return source.inductance
    default:
      return undefined
  }
}

const getComponentKey = (
  component: SelectedComponent,
  groupByComponent: boolean,
): string => {
  const sourceId = component.source.source_component_id
  if (!groupByComponent) return `source:${sourceId}`

  const manufacturerPartNumber = component.source.manufacturer_part_number
  if (
    typeof manufacturerPartNumber === "string" &&
    manufacturerPartNumber.trim()
  ) {
    return `mpn:${normalizeIdentity(manufacturerPartNumber)}`
  }

  const supplierIdentity = getPreferredSupplierIdentity(
    getSupplierPartNumbers(component.source.supplier_part_numbers),
  )
  if (supplierIdentity) return supplierIdentity

  const passiveValue = getPassiveValue(component.source)
  const packageIdentity = component.footprint ?? component.physicalSize
  if (
    passiveValue !== undefined &&
    passiveValue !== null &&
    packageIdentity &&
    typeof component.source.ftype === "string"
  ) {
    return `passive:${component.source.ftype}:${String(passiveValue)}:${normalizeIdentity(packageIdentity)}`
  }

  // Without a part number or a value-and-package match, grouping would be a
  // guess that could mix physically different parts.
  return `source:${sourceId}`
}

const selectComponents = (
  circuitJson: CircuitJson,
  options: ExtractComponentGroupsOptions,
): SelectedComponent[] => {
  if (!Array.isArray(circuitJson)) {
    throw new TypeError("Circuit JSON must be an array")
  }

  const sources: SelectedComponent["source"][] = []
  const placedBySourceId = new Map<string, CircuitRecord>()
  const cadByPcbComponentId = new Map<string, CircuitRecord>()
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
      sources.push(
        record as SelectedComponent["source"] & {
          source_component_id: string
          name: string
        },
      )
    }

    if (record.type === "pcb_component") {
      hasPcbComponents = true
      if (
        record.do_not_place !== true &&
        typeof record.source_component_id === "string"
      ) {
        placedBySourceId.set(record.source_component_id, record)
      }
    }

    if (
      record.type === "cad_component" &&
      typeof record.pcb_component_id === "string"
    ) {
      cadByPcbComponentId.set(record.pcb_component_id, record)
    }
  }

  const shouldFilterUnplaced =
    !options.includeUnplacedComponents && hasPcbComponents
  const selected = sources
    .filter((source) => {
      if (!options.includeTestPoints && source.ftype === "simple_test_point") {
        return false
      }
      return (
        !shouldFilterUnplaced ||
        placedBySourceId.has(source.source_component_id)
      )
    })
    .map((source): SelectedComponent => {
      const pcb = placedBySourceId.get(source.source_component_id)
      const cad =
        pcb && typeof pcb.pcb_component_id === "string"
          ? cadByPcbComponentId.get(pcb.pcb_component_id)
          : undefined
      const footprint =
        typeof cad?.footprinter_string === "string" &&
        cad.footprinter_string.trim()
          ? cad.footprinter_string.trim()
          : undefined
      const physicalSize =
        typeof pcb?.width === "number" && typeof pcb.height === "number"
          ? `${pcb.width}x${pcb.height}`
          : undefined
      return { source, footprint, physicalSize }
    })

  if (selected.length === 0) {
    throw new Error(
      shouldFilterUnplaced
        ? "Circuit JSON has no placed, populated components to assign to compartments"
        : "Circuit JSON has no components to assign to compartments",
    )
  }

  const duplicateRefdes = selected
    .map(({ source }) => source.name.trim())
    .find((refdes, index, all) => all.indexOf(refdes) !== index)
  if (duplicateRefdes) {
    throw new Error(`Duplicate component refdes: ${duplicateRefdes}`)
  }

  return selected
}

export const extractComponentGroups = (
  circuitJson: CircuitJson,
  options: ExtractComponentGroupsOptions = {},
): ComponentGroup[] => {
  const groupByComponent = options.groupByComponent ?? true
  const grouped = new Map<string, ComponentGroup>()

  for (const component of selectComponents(circuitJson, options)) {
    const componentKey = getComponentKey(component, groupByComponent)
    const refdes = component.source.name.trim()
    const existing = grouped.get(componentKey)
    if (existing) {
      existing.referenceDesignators.push(refdes)
      existing.quantity += 1
      continue
    }

    const manufacturerPartNumber =
      typeof component.source.manufacturer_part_number === "string" &&
      component.source.manufacturer_part_number.trim()
        ? component.source.manufacturer_part_number.trim()
        : undefined
    grouped.set(componentKey, {
      componentKey,
      referenceDesignators: [refdes],
      quantity: 1,
      componentType:
        typeof component.source.ftype === "string"
          ? component.source.ftype
          : undefined,
      manufacturerPartNumber,
      supplierPartNumbers: getSupplierPartNumbers(
        component.source.supplier_part_numbers,
      ),
      footprint: component.footprint,
    })
  }

  const groups = [...grouped.values()]
  for (const group of groups) {
    group.referenceDesignators.sort((a, b) =>
      naturalRefdesCollator.compare(a, b),
    )
  }
  return groups.sort((a, b) =>
    naturalRefdesCollator.compare(
      a.referenceDesignators[0]!,
      b.referenceDesignators[0]!,
    ),
  )
}
