import { describe, expect, test } from "bun:test"
import { strFromU8, unzipSync } from "fflate"
import { createFdmComponentBox } from "lib/create-fdm-component-box"
import { sampleCircuitJson } from "tests/fixtures/sample-circuit"

const getModelXml = (threeMf: Uint8Array): string => {
  const files = unzipSync(threeMf)
  const model = files["3D/3dmodel.model"]
  if (!model) throw new Error("3MF model part is missing")
  return strFromU8(model)
}

const getBambuModelSettings = (threeMf: Uint8Array): string => {
  const files = unzipSync(threeMf)
  const settings = files["Metadata/model_settings.config"]
  if (!settings) throw new Error("Bambu Studio model settings are missing")
  return strFromU8(settings)
}

const getObjectXml = (model: string, name: string): string => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const object = model.match(
    new RegExp(`<object[^>]*name="${escapedName}"[^>]*>[\\s\\S]*?</object>`),
  )?.[0]
  if (!object) throw new Error(`Object ${name} is missing`)
  return object
}

const getVertexAxis = (objectXml: string, axis: "x" | "y" | "z"): number[] =>
  [...objectXml.matchAll(new RegExp(`\\b${axis}="([^"]+)"`, "g"))].map(
    (match) => Number(match[1]),
  )

describe("createFdmComponentBox", () => {
  test("creates a slicer-oriented multi-material 3MF assembly", async () => {
    const result = await createFdmComponentBox(sampleCircuitJson)
    const files = unzipSync(result.threeMf)

    expect(Object.keys(files).sort()).toEqual([
      "3D/3dmodel.model",
      "Metadata/model_settings.config",
      "[Content_Types].xml",
      "_rels/.rels",
    ])
    expect(result.componentRefdes).toEqual(["C1", "R1", "R10", "U2"])
    expect(result.dimensions).toMatchObject({
      depth: 61.8,
      height: 13.6,
      columns: 2,
      rows: 2,
    })
    expect(result.dimensions.width).toBeCloseTo(56.8)
    expect(result.meshStats.boxTriangles).toBeGreaterThan(0)
    expect(result.meshStats.labelTriangles).toBeGreaterThan(0)
    expect(result.meshStats.totalTriangles).toBe(
      result.meshStats.boxTriangles + result.meshStats.labelTriangles,
    )

    const model = getModelXml(result.threeMf)
    expect(model).toContain('<basematerials id="1">')
    expect(model).toContain('<base name="Box" displaycolor="#D9D9D9FF" />')
    expect(model).toContain('<base name="Labels" displaycolor="#151515FF" />')
    expect(model).toContain(
      '<object id="2" type="model" name="Box" pid="1" pindex="0">',
    )
    for (const refdes of result.componentRefdes) {
      expect(model).toContain(`name="Label ${refdes}" pid="1" pindex="1"`)
    }
    expect((model.match(/<object\b/g) ?? []).length).toBe(
      result.componentRefdes.length + 2,
    )
    expect(model).toContain('<component objectid="2" />')
    expect(model).toContain('<item objectid="7" />')

    const bambuSettings = getBambuModelSettings(result.threeMf)
    expect(bambuSettings).toContain('<object id="7">')
    expect(bambuSettings).toContain('<part id="2" subtype="normal_part">')
    expect(bambuSettings).toContain('<metadata key="name" value="Box"/>')
    expect(
      (bambuSettings.match(/key="extruder" value="2"/g) ?? []).length,
    ).toBe(result.componentRefdes.length)
    for (const refdes of result.componentRefdes) {
      expect(bambuSettings).toContain(
        `<metadata key="name" value="Label ${refdes}"/>`,
      )
    }
  })

  test("places label geometry directly on top of the box material", async () => {
    const result = await createFdmComponentBox(sampleCircuitJson)
    const model = getModelXml(result.threeMf)
    const boxZ = getVertexAxis(getObjectXml(model, "Box"), "z")
    const labelZ = getVertexAxis(getObjectXml(model, "Label C1"), "z")

    expect(Math.min(...boxZ)).toBeCloseTo(0, 5)
    expect(Math.max(...boxZ)).toBeCloseTo(result.dimensions.height, 5)
    expect(Math.min(...labelZ)).toBeCloseTo(result.dimensions.height, 5)
    expect(Math.max(...labelZ)).toBeCloseTo(result.dimensions.height + 0.6, 5)
  })

  test("uses an irregular final row instead of adding spare compartments", async () => {
    const result = await createFdmComponentBox(sampleCircuitJson, {
      columns: 3,
    })

    expect(result.dimensions.columns).toBe(3)
    expect(result.dimensions.rows).toBe(2)
    expect(result.dimensions.width).toBeCloseTo(84.4)
    expect(result.compartments).toHaveLength(4)
    expect(result.compartments[3]).toMatchObject({
      refdes: "U2",
      row: 1,
      column: 0,
    })
  })

  test("escapes 3MF metadata and rejects unprintably thin labels", async () => {
    const escaped = await createFdmComponentBox(sampleCircuitJson, {
      title: "R&D <assembly>",
    })
    expect(getModelXml(escaped.threeMf)).toContain("R&amp;D &lt;assembly&gt;")

    await expect(
      createFdmComponentBox(sampleCircuitJson, {
        labelBandDepth: 2,
        labelPadding: 0.5,
      }),
    ).rejects.toThrow("below minimumLabelStrokeWidth")
  })
})
