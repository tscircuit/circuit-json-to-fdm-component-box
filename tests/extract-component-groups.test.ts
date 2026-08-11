import { describe, expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { readFile } from "node:fs/promises"
import { extractComponentGroups } from "lib/extract-component-groups"
import { groupedCircuitJson } from "tests/fixtures/sample-circuit"

describe("extractComponentGroups", () => {
  test("groups identical manufacturer and supplier BOM parts", () => {
    const groups = extractComponentGroups(groupedCircuitJson)

    expect(groups).toHaveLength(3)
    expect(groups.map((group) => group.referenceDesignators)).toEqual([
      ["C1", "C2"],
      ["R1", "R2"],
      ["U1"],
    ])
    expect(groups[0]).toMatchObject({
      componentKey: "supplier:jlcpcb:C1525",
      quantity: 2,
      supplierPartNumbers: { jlcpcb: ["C1525"] },
    })
    expect(groups[1]).toMatchObject({
      componentKey: "mpn:RC0402FR-0710KL",
      quantity: 2,
      manufacturerPartNumber: "RC0402FR-0710KL",
    })
  })

  test("can retain one compartment per refdes", () => {
    const groups = extractComponentGroups(groupedCircuitJson, {
      groupByComponent: false,
    })
    expect(groups).toHaveLength(5)
    expect(groups.every((group) => group.quantity === 1)).toBe(true)
  })

  test("extracts shared compartments from the abse/gameboy BOM", async () => {
    const circuitJson = JSON.parse(
      await readFile(
        new URL("./fixtures/gameboy-bom-circuit.json", import.meta.url),
        "utf8",
      ),
    ) as CircuitJson
    const groups = extractComponentGroups(circuitJson)

    expect(groups).toHaveLength(40)
    expect(groups.reduce((sum, group) => sum + group.quantity, 0)).toBe(78)
    expect(
      groups.find(
        ({ manufacturerPartNumber }) =>
          manufacturerPartNumber === "KH_6X6X15H_SMT_FS_D",
      ),
    ).toMatchObject({ quantity: 10 })
    expect(
      groups.find(
        ({ componentKey }) => componentKey === "supplier:jlcpcb:C1525",
      ),
    ).toMatchObject({ quantity: 9 })
  })
})
