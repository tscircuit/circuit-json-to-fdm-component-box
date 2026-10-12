import ManifoldModule, { type ManifoldToplevel } from "manifold-3d"

let manifoldModulePromise: Promise<ManifoldToplevel> | undefined
let initializationFailed = false

const loadManifold = (wasmBinary?: Uint8Array): Promise<ManifoldToplevel> => {
  initializationFailed = false
  const pending = ManifoldModule(
    wasmBinary
      ? // The published declaration omits Emscripten's wasmBinary option.
        ({ wasmBinary } as unknown as Parameters<typeof ManifoldModule>[0])
      : undefined,
  )
    .then((module) => {
      module.setup()
      return module
    })
    .catch((error) => {
      initializationFailed = true
      throw error
    })
  manifoldModulePromise = pending
  return pending
}

/** Call before generating meshes to use bundled or cached WASM bytes. */
export const initializeFdmComponentBoxManifold = async (
  wasmBinary: Uint8Array | ArrayBuffer,
): Promise<void> => {
  if (manifoldModulePromise && !initializationFailed) {
    throw new Error("FDM component box Manifold has already been initialized")
  }
  const bytes = new Uint8Array(wasmBinary)
  await loadManifold(bytes)
}

export const getManifoldModule = (): Promise<ManifoldToplevel> =>
  manifoldModulePromise ?? loadManifold()
