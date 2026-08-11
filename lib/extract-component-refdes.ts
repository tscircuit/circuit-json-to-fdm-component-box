import type { CircuitJson } from "circuit-json"
import {
  extractComponentGroups,
  type ExtractComponentGroupsOptions,
  naturalRefdesCollator,
} from "./extract-component-groups"

/**
 * Returns the physical component refdes values that should receive pockets.
 *
 * When the document contains pcb_component records, unplaced source components
 * are omitted by default. Source-only Circuit JSON falls back to all source
 * components so partially rendered documents remain useful.
 */
export const extractComponentRefdes = (
  circuitJson: CircuitJson,
  options: Omit<ExtractComponentGroupsOptions, "groupByComponent"> = {},
): string[] =>
  extractComponentGroups(circuitJson, {
    ...options,
    groupByComponent: false,
  })
    .flatMap(({ referenceDesignators }) => referenceDesignators)
    .sort((a, b) => naturalRefdesCollator.compare(a, b))
