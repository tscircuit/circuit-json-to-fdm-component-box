import {
  DEFAULT_FDM_COMPONENT_BOX_OPTIONS,
  type ComponentGroup,
  type CompartmentPlacement,
  type FdmComponentBoxDimensions,
  type FdmComponentBoxOptions,
  type ResolvedFdmComponentBoxOptions,
} from "./types"
import { formatComponentGroupLabel } from "./format-component-group-label"

const assertPositive = (value: number, name: string): number => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`)
  }
  return value
}

const normalizeColor = (value: string, name: string): string => {
  if (!/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value)) {
    throw new TypeError(`${name} must use #RRGGBB or #RRGGBBAA notation`)
  }
  return `${value.toUpperCase()}${value.length === 7 ? "FF" : ""}`
}

export const resolveFdmComponentBoxOptions = (
  componentGroups: readonly ComponentGroup[],
  options: FdmComponentBoxOptions,
): {
  options: ResolvedFdmComponentBoxOptions
  dimensions: FdmComponentBoxDimensions
  compartments: CompartmentPlacement[]
} => {
  if (componentGroups.length === 0) {
    throw new Error("At least one component is required")
  }

  const requestedColumns =
    options.columns ?? Math.ceil(Math.sqrt(componentGroups.length))
  if (!Number.isInteger(requestedColumns) || requestedColumns <= 0) {
    throw new RangeError("columns must be a positive integer")
  }

  const columns = Math.min(requestedColumns, componentGroups.length)
  const compartmentWidth = assertPositive(
    options.compartmentWidth ??
      DEFAULT_FDM_COMPONENT_BOX_OPTIONS.compartmentWidth,
    "compartmentWidth",
  )
  const compartmentDepth = assertPositive(
    options.compartmentDepth ??
      DEFAULT_FDM_COMPONENT_BOX_OPTIONS.compartmentDepth,
    "compartmentDepth",
  )
  const compartmentHeight = assertPositive(
    options.compartmentHeight ??
      DEFAULT_FDM_COMPONENT_BOX_OPTIONS.compartmentHeight,
    "compartmentHeight",
  )
  const wallThickness = assertPositive(
    options.wallThickness ?? DEFAULT_FDM_COMPONENT_BOX_OPTIONS.wallThickness,
    "wallThickness",
  )
  const floorThickness = assertPositive(
    options.floorThickness ?? DEFAULT_FDM_COMPONENT_BOX_OPTIONS.floorThickness,
    "floorThickness",
  )
  const labelBandDepth = assertPositive(
    options.labelBandDepth ?? DEFAULT_FDM_COMPONENT_BOX_OPTIONS.labelBandDepth,
    "labelBandDepth",
  )
  const labelThickness = assertPositive(
    options.labelThickness ?? DEFAULT_FDM_COMPONENT_BOX_OPTIONS.labelThickness,
    "labelThickness",
  )
  const labelPadding = assertPositive(
    options.labelPadding ?? DEFAULT_FDM_COMPONENT_BOX_OPTIONS.labelPadding,
    "labelPadding",
  )
  const minimumLabelStrokeWidth = assertPositive(
    options.minimumLabelStrokeWidth ??
      DEFAULT_FDM_COMPONENT_BOX_OPTIONS.minimumLabelStrokeWidth,
    "minimumLabelStrokeWidth",
  )

  if (labelPadding * 2 >= compartmentWidth) {
    throw new RangeError("labelPadding leaves no horizontal room for text")
  }
  if (labelPadding * 2 >= labelBandDepth) {
    throw new RangeError("labelPadding leaves no vertical room for text")
  }

  const rows = Math.ceil(componentGroups.length / columns)
  const rowInnerDepth = compartmentDepth + labelBandDepth
  const rowPitch = rowInnerDepth + wallThickness
  const dimensions = {
    width: columns * compartmentWidth + (columns + 1) * wallThickness,
    depth: rows * rowInnerDepth + (rows + 1) * wallThickness,
    height: floorThickness + compartmentHeight,
    columns,
    rows,
  }

  const compartments = componentGroups.map((group, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const rowY = row * rowPitch
    const cavityX = wallThickness + column * (compartmentWidth + wallThickness)
    const cavityY = rowY + wallThickness
    const labelY = cavityY + compartmentDepth

    return {
      refdes: group.referenceDesignators[0]!,
      referenceDesignators: [...group.referenceDesignators],
      label: formatComponentGroupLabel(group.referenceDesignators, {
        availableWidth: compartmentWidth - labelPadding * 2,
        availableHeight: labelBandDepth - labelPadding * 2,
        minimumStrokeWidth: minimumLabelStrokeWidth,
      }),
      componentKey: group.componentKey,
      quantity: group.quantity,
      row,
      column,
      center: {
        x: cavityX + compartmentWidth / 2,
        y: cavityY + compartmentDepth / 2,
      },
      labelCenter: {
        x: cavityX + compartmentWidth / 2,
        y: labelY + labelBandDepth / 2,
      },
      width: compartmentWidth,
      depth: compartmentDepth,
    }
  })
  const duplicateLabel = compartments
    .map(({ label }) => label)
    .find((label, index, labels) => labels.indexOf(label) !== index)
  if (duplicateLabel) {
    throw new Error(
      `Compartment label ${JSON.stringify(duplicateLabel)} is ambiguous after abbreviation; increase compartmentWidth or labelBandDepth`,
    )
  }

  return {
    options: {
      columns,
      compartmentWidth,
      compartmentDepth,
      compartmentHeight,
      wallThickness,
      floorThickness,
      labelBandDepth,
      labelThickness,
      labelPadding,
      minimumLabelStrokeWidth,
      includeUnplacedComponents:
        options.includeUnplacedComponents ??
        DEFAULT_FDM_COMPONENT_BOX_OPTIONS.includeUnplacedComponents,
      includeTestPoints:
        options.includeTestPoints ??
        DEFAULT_FDM_COMPONENT_BOX_OPTIONS.includeTestPoints,
      groupByComponent:
        options.groupByComponent ??
        DEFAULT_FDM_COMPONENT_BOX_OPTIONS.groupByComponent,
      boxColor: normalizeColor(
        options.boxColor ?? DEFAULT_FDM_COMPONENT_BOX_OPTIONS.boxColor,
        "boxColor",
      ),
      labelColor: normalizeColor(
        options.labelColor ?? DEFAULT_FDM_COMPONENT_BOX_OPTIONS.labelColor,
        "labelColor",
      ),
      title:
        options.title?.trim() ||
        (() => {
          const componentCount = componentGroups.reduce(
            (sum, group) => sum + group.quantity,
            0,
          )
          return componentCount === componentGroups.length
            ? `Assembly box for ${componentCount} components`
            : `Assembly box for ${componentCount} components in ${componentGroups.length} compartments`
        })(),
    },
    dimensions,
    compartments,
  }
}
