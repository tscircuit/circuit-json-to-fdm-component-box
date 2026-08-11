import type { CircuitJson } from "circuit-json"
import {
  createSceneFromGLTF,
  encodePNG,
  renderSceneFromGLTF,
  type RenderOptionsInput,
} from "poppygl"
import { buildFdmComponentBox } from "./build-fdm-component-box"
import type { PrintableMesh } from "./manifold-meshes"
import type { FdmComponentBoxOptions } from "./types"

export type FdmComponentBoxPngOptions = RenderOptionsInput

const colorToFactor = (color: string): [number, number, number, number] => {
  const hex = color.slice(1)
  return [
    Number.parseInt(hex.slice(0, 2), 16) / 255,
    Number.parseInt(hex.slice(2, 4), 16) / 255,
    Number.parseInt(hex.slice(4, 6), 16) / 255,
    Number.parseInt(hex.slice(6, 8) || "FF", 16) / 255,
  ]
}

const expandMeshForFlatShading = (
  mesh: PrintableMesh,
): { vertices: Float32Array; triangles: Uint32Array } => {
  const vertices = new Float32Array(mesh.triangles.length * 3)
  const triangles = new Uint32Array(mesh.triangles.length)
  for (let index = 0; index < mesh.triangles.length; index += 1) {
    const sourceOffset = mesh.triangles[index]! * 3
    const destinationOffset = index * 3
    vertices[destinationOffset] = mesh.vertices[sourceOffset]!
    vertices[destinationOffset + 1] = mesh.vertices[sourceOffset + 1]!
    vertices[destinationOffset + 2] = mesh.vertices[sourceOffset + 2]!
    triangles[index] = index
  }
  return { vertices, triangles }
}

const createPoppyGlScene = (
  meshes: readonly PrintableMesh[],
  colors: readonly string[],
) => {
  const buffers: Uint8Array[] = []
  const bufferDefinitions: Array<{ byteLength: number }> = []
  const bufferViews: Array<{
    buffer: number
    byteLength: number
    target: number
  }> = []
  const accessors: Array<{
    bufferView: number
    componentType: number
    count: number
    type: "VEC3" | "SCALAR"
  }> = []
  const gltfMeshes: Array<{
    name: string
    primitives: Array<{
      attributes: { POSITION: number }
      indices: number
      material: number
      mode: number
    }>
  }> = []

  for (const mesh of meshes) {
    const flatMesh = expandMeshForFlatShading(mesh)
    const positionBuffer = new Uint8Array(
      flatMesh.vertices.buffer,
      flatMesh.vertices.byteOffset,
      flatMesh.vertices.byteLength,
    )
    const indexBuffer = new Uint8Array(
      flatMesh.triangles.buffer,
      flatMesh.triangles.byteOffset,
      flatMesh.triangles.byteLength,
    )
    const positionBufferIndex = buffers.push(positionBuffer) - 1
    const indexBufferIndex = buffers.push(indexBuffer) - 1
    bufferDefinitions.push(
      { byteLength: positionBuffer.byteLength },
      { byteLength: indexBuffer.byteLength },
    )

    const positionView =
      bufferViews.push({
        buffer: positionBufferIndex,
        byteLength: positionBuffer.byteLength,
        target: 34962,
      }) - 1
    const indexView =
      bufferViews.push({
        buffer: indexBufferIndex,
        byteLength: indexBuffer.byteLength,
        target: 34963,
      }) - 1
    const positionAccessor =
      accessors.push({
        bufferView: positionView,
        componentType: 5126,
        count: flatMesh.vertices.length / 3,
        type: "VEC3",
      }) - 1
    const indexAccessor =
      accessors.push({
        bufferView: indexView,
        componentType: 5125,
        count: flatMesh.triangles.length,
        type: "SCALAR",
      }) - 1
    gltfMeshes.push({
      name: mesh.name,
      primitives: [
        {
          attributes: { POSITION: positionAccessor },
          indices: indexAccessor,
          material: mesh.materialIndex,
          mode: 4,
        },
      ],
    })
  }

  const nodes = meshes.map((mesh, meshIndex) => ({
    name: mesh.name,
    mesh: meshIndex,
  }))
  const gltf = {
    asset: { version: "2.0", generator: "circuit-json-to-fdm-component-box" },
    buffers: bufferDefinitions,
    bufferViews,
    accessors,
    materials: colors.map((color, index) => ({
      name: index === 0 ? "Box" : "Labels",
      pbrMetallicRoughness: {
        baseColorFactor: colorToFactor(color),
        metallicFactor: 0,
        roughnessFactor: 0.72,
      },
    })),
    meshes: gltfMeshes,
    nodes,
    scenes: [{ nodes: nodes.map((_, index) => index) }],
    scene: 0,
  }

  return createSceneFromGLTF(gltf, { buffers, images: [] })
}

/** Render a deterministic, pure-JavaScript PNG preview directly from Circuit JSON. */
export const renderFdmComponentBoxPng = async (
  circuitJson: CircuitJson,
  boxOptions: FdmComponentBoxOptions = {},
  renderOptions: FdmComponentBoxPngOptions = {},
): Promise<Uint8Array> => {
  const built = await buildFdmComponentBox(circuitJson, boxOptions)
  const scene = createPoppyGlScene(
    [built.meshes.box, ...built.meshes.labels],
    [built.options.boxColor, built.options.labelColor],
  )
  const viewSize = Math.max(built.dimensions.width, built.dimensions.depth)
  const { bitmap } = renderSceneFromGLTF(scene, {
    width: 800,
    height: 600,
    supersampling: 1,
    fov: 38,
    ambient: 0.32,
    lightDir: [-0.45, 0.55, -0.7],
    up: "z+",
    camPos: [
      built.dimensions.width * 1.18,
      -built.dimensions.depth * 0.72,
      built.dimensions.height + viewSize * 0.9,
    ],
    lookAt: [
      built.dimensions.width / 2,
      built.dimensions.depth / 2,
      built.dimensions.height * 0.35,
    ],
    backgroundColor: "#F6F3ED",
    ...renderOptions,
  })
  return encodePNG(bitmap)
}
