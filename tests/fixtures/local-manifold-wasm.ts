import { expect, test } from "bun:test"
import { strFromU8, unzipSync } from "fflate"
import {
  createFdmComponentBox,
  initializeFdmComponentBoxManifold,
} from "../../lib/index"
import { sampleCircuitJson } from "tests/fixtures/sample-circuit"

test("supplied WASM rejects invalid bytes then generates a real 3MF locally", async () => {
  const previousFetch = globalThis.fetch
  const requests: unknown[] = []
  globalThis.fetch = Object.assign(
    async (...request: Parameters<typeof fetch>) => {
      requests.push(request)
      throw new Error("Network access is disabled")
    },
    { preconnect: () => {} },
  )
  try {
    await expect(
      initializeFdmComponentBoxManifold(new Uint8Array([0])),
    ).rejects.toThrow()
    await expect(createFdmComponentBox(sampleCircuitJson)).rejects.toThrow()
    const wasm = await Bun.file(
      new URL("../../node_modules/manifold-3d/manifold.wasm", import.meta.url),
    ).arrayBuffer()
    await initializeFdmComponentBoxManifold(wasm)
    const result = await createFdmComponentBox(sampleCircuitJson)
    expect(result.componentRefdes).toEqual(["C1", "R1", "R10", "U2"])
    expect(result.meshStats.totalTriangles).toBeGreaterThan(0)
    const model = unzipSync(result.threeMf)["3D/3dmodel.model"]!
    expect(strFromU8(model)).toContain('<object id="2" type="model" name="Box"')
    expect(requests).toEqual([])
    await expect(initializeFdmComponentBoxManifold(wasm)).rejects.toThrow(
      "already been initialized",
    )
  } finally {
    globalThis.fetch = previousFetch
  }
})
