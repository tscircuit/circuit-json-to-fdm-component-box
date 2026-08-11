import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { readFile } from "node:fs/promises"
import { renderFdmComponentBoxPng } from "lib/render-fdm-component-box-png"
import {
  groupedCircuitJson,
  sampleCircuitJson,
} from "tests/fixtures/sample-circuit"

test("renders a four-compartment box with PoppyGL", async () => {
  const png = await renderFdmComponentBoxPng(
    sampleCircuitJson,
    { columns: 2 },
    { width: 640, height: 480 },
  )

  await expect(png).toMatchPngSnapshot(import.meta.path, "four-compartments")
})

test("renders grouped BOM components with shared compartments", async () => {
  const png = await renderFdmComponentBoxPng(
    groupedCircuitJson,
    { columns: 2 },
    { width: 640, height: 480 },
  )

  await expect(png).toMatchPngSnapshot(import.meta.path, "grouped-components")
})

test(
  "renders the abse/gameboy BOM as a grouped assembly box",
  async () => {
    const gameboyCircuitJson = JSON.parse(
      await readFile(
        new URL("./fixtures/gameboy-bom-circuit.json", import.meta.url),
        "utf8",
      ),
    ) as CircuitJson
    const png = await renderFdmComponentBoxPng(
      gameboyCircuitJson,
      { columns: 7 },
      { width: 800, height: 700 },
    )

    await expect(png).toMatchPngSnapshot(import.meta.path, "gameboy-bom")
  },
  { timeout: 60_000 },
)
