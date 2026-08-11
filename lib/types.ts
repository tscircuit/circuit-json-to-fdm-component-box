import type { CircuitJson } from "circuit-json"

export type { CircuitJson }

export interface FdmComponentBoxOptions {
  /** Number of compartments per row. Defaults to a near-square layout. */
  columns?: number
  /** Clear X dimension of each compartment, in millimetres. */
  compartmentWidth?: number
  /** Clear Y dimension of each compartment, in millimetres. */
  compartmentDepth?: number
  /** Clear Z depth from the floor to the rim, in millimetres. */
  compartmentHeight?: number
  /** Thickness of outside and divider walls, in millimetres. */
  wallThickness?: number
  /** Thickness beneath each compartment, in millimetres. */
  floorThickness?: number
  /** Solid Y-depth behind each compartment that carries its label. */
  labelBandDepth?: number
  /** Height of the raised label above the box rim, in millimetres. */
  labelThickness?: number
  /** Empty margin around each label, in millimetres. */
  labelPadding?: number
  /** Smallest allowed text stroke, in millimetres. */
  minimumLabelStrokeWidth?: number
  /** Include source components that do not have a pcb_component record. */
  includeUnplacedComponents?: boolean
  /** Include test points, which are excluded from assembly compartments by default. */
  includeTestPoints?: boolean
  /** Group confidently identical BOM parts into one compartment. Defaults to true. */
  groupByComponent?: boolean
  /** Core 3MF display color for the box material, as #RRGGBB or #RRGGBBAA. */
  boxColor?: string
  /** Core 3MF display color for the label material, as #RRGGBB or #RRGGBBAA. */
  labelColor?: string
  /** Title stored in the 3MF model metadata. */
  title?: string
}

export interface ComponentGroup {
  /** Stable description of the BOM identity used for this group. */
  componentKey: string
  /** Every refdes whose physical parts belong in this compartment. */
  referenceDesignators: string[]
  quantity: number
  componentType?: string
  manufacturerPartNumber?: string
  supplierPartNumbers?: Record<string, string[]>
  footprint?: string
}

export interface FdmComponentBoxDimensions {
  /** Overall X dimension, in millimetres. */
  width: number
  /** Overall Y dimension, in millimetres. */
  depth: number
  /** Overall Z dimension excluding raised text, in millimetres. */
  height: number
  columns: number
  rows: number
}

export interface CompartmentPlacement {
  /** Primary refdes, retained for compatibility with one-component compartments. */
  refdes: string
  /** All refdes values assigned to this compartment. */
  referenceDesignators: string[]
  /** Text physically embossed above the compartment. */
  label: string
  componentKey: string
  quantity: number
  row: number
  column: number
  /** Cavity center in the box coordinate frame, in millimetres. */
  center: { x: number; y: number }
  /** Center of the solid label band behind this cavity, in millimetres. */
  labelCenter: { x: number; y: number }
  width: number
  depth: number
}

export interface FdmComponentBoxMeshStats {
  boxTriangles: number
  labelTriangles: number
  totalTriangles: number
}

export interface FdmComponentBoxResult {
  /** Ready-to-write 3MF package bytes. */
  threeMf: Uint8Array
  /** Naturally sorted refdes values represented by all compartments. */
  componentRefdes: string[]
  /** BOM-aware groups, one per generated compartment. */
  componentGroups: ComponentGroup[]
  dimensions: FdmComponentBoxDimensions
  compartments: CompartmentPlacement[]
  meshStats: FdmComponentBoxMeshStats
}

export interface ResolvedFdmComponentBoxOptions {
  columns: number
  compartmentWidth: number
  compartmentDepth: number
  compartmentHeight: number
  wallThickness: number
  floorThickness: number
  labelBandDepth: number
  labelThickness: number
  labelPadding: number
  minimumLabelStrokeWidth: number
  includeUnplacedComponents: boolean
  includeTestPoints: boolean
  groupByComponent: boolean
  boxColor: string
  labelColor: string
  title: string
}

export const DEFAULT_FDM_COMPONENT_BOX_OPTIONS = {
  compartmentWidth: 26,
  compartmentDepth: 22,
  compartmentHeight: 12,
  wallThickness: 1.6,
  floorThickness: 1.6,
  labelBandDepth: 6.5,
  labelThickness: 0.6,
  labelPadding: 0.75,
  minimumLabelStrokeWidth: 0.45,
  includeUnplacedComponents: false,
  includeTestPoints: false,
  groupByComponent: true,
  boxColor: "#D9D9D9FF",
  labelColor: "#151515FF",
} as const
