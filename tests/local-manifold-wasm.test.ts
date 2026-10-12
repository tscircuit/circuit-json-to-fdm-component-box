import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"

test("initializes local WASM in a fresh realm and generates a real 3MF", async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      "test",
      fileURLToPath(
        new URL("./fixtures/local-manifold-wasm.ts", import.meta.url),
      ),
    ],
    { stdout: "pipe", stderr: "pipe" },
  )
  const [status, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (status !== 0) throw new Error(`${stdout}\n${stderr}`)
  expect(status).toBe(0)
})
