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
  /** Core 3MF display color for the box material, as #RRGGBB or #RRGGBBAA. */
  boxColor?: string
  /** Core 3MF display color for the label material, as #RRGGBB or #RRGGBBAA. */
  labelColor?: string
  /** Title stored in the 3MF model metadata. */
  title?: string
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
  refdes: string
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
  /** Naturally sorted refdes values represented by the compartments. */
  componentRefdes: string[]
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
  boxColor: "#D9D9D9FF",
  labelColor: "#151515FF",
} as const
