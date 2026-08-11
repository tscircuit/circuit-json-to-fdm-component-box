import { describe, expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { extractComponentRefdes } from "lib/extract-component-refdes"
import {
  sampleCircuitJson,
  sourceOnlyCircuitJson,
} from "tests/fixtures/sample-circuit"

describe("extractComponentRefdes", () => {
  test("selects placed components and sorts refdes values naturally", () => {
    expect(extractComponentRefdes(sampleCircuitJson)).toEqual([
      "C1",
      "R1",
      "R10",
      "U2",
    ])
  })

  test("can include unplaced source components", () => {
    expect(
      extractComponentRefdes(sampleCircuitJson, {
        includeUnplacedComponents: true,
      }),
    ).toEqual(["C1", "R1", "R10", "TP1", "U2"])
  })

  test("excludes do-not-place components from assembly compartments", () => {
    const circuitJson = sampleCircuitJson.map((element) =>
      element.type === "pcb_component" &&
      element.source_component_id === "source_resistor_10"
        ? { ...element, do_not_place: true }
        : element,
    ) as CircuitJson

    expect(extractComponentRefdes(circuitJson)).toEqual(["C1", "R1", "U2"])
    expect(
      extractComponentRefdes(circuitJson, {
        includeUnplacedComponents: true,
      }),
    ).toEqual(["C1", "R1", "R10", "TP1", "U2"])
  })

  test("falls back to source components when PCB records are absent", () => {
    expect(extractComponentRefdes(sourceOnlyCircuitJson)).toEqual([
      "C1",
      "R1",
      "R10",
      "TP1",
      "U2",
    ])
  })

  test("rejects duplicate refdes values", () => {
    const duplicate = [
      {
        type: "source_component",
        source_component_id: "source_resistor_1",
        name: "R1",
      },
      {
        type: "source_component",
        source_component_id: "source_resistor_2",
        name: "R1",
      },
    ] as unknown as CircuitJson

    expect(() => extractComponentRefdes(duplicate)).toThrow(
      "Duplicate component refdes: R1",
    )
  })
})
