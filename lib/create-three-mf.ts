import { strToU8, zipSync } from "fflate"
import type { PrintableMesh } from "./manifold-meshes"

interface CreateThreeMfOptions {
  box: PrintableMesh
  labels: PrintableMesh[]
  boxColor: string
  labelColor: string
  title: string
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>
`

const RELATIONSHIPS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>
`

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

const formatNumber = (value: number): string => {
  const normalized = Math.abs(value) < 0.0000005 ? 0 : value
  return normalized
    .toFixed(6)
    .replace(/(?:\.0+|(?<decimal>\.[0-9]*?)0+)$/, "$<decimal>")
}

const appendMeshObject = (
  output: string[],
  mesh: PrintableMesh,
  objectId: number,
): void => {
  output.push(
    `    <object id="${objectId}" type="model" name="${escapeXml(mesh.name)}" pid="1" pindex="${mesh.materialIndex}">\n`,
    "      <mesh>\n",
    "        <vertices>\n",
  )

  for (let index = 0; index < mesh.vertices.length; index += 3) {
    output.push(
      `          <vertex x="${formatNumber(mesh.vertices[index]!)}" y="${formatNumber(mesh.vertices[index + 1]!)}" z="${formatNumber(mesh.vertices[index + 2]!)}" />\n`,
    )
  }

  output.push("        </vertices>\n", "        <triangles>\n")
  for (let index = 0; index < mesh.triangles.length; index += 3) {
    output.push(
      `          <triangle v1="${mesh.triangles[index]}" v2="${mesh.triangles[index + 1]}" v3="${mesh.triangles[index + 2]}" />\n`,
    )
  }

  output.push("        </triangles>\n", "      </mesh>\n", "    </object>\n")
}

const createBambuModelSettings = (
  meshes: readonly PrintableMesh[],
  assemblyId: number,
  title: string,
): string => {
  const settings = [
    '<?xml version="1.0" encoding="UTF-8"?>\n',
    "<config>\n",
    `  <object id="${assemblyId}">\n`,
    `    <metadata key="name" value="${escapeXml(title)}"/>\n`,
    '    <metadata key="extruder" value="1"/>\n',
  ]

  for (const [index, mesh] of meshes.entries()) {
    const objectId = index + 2
    const extruder = mesh.materialIndex + 1
    settings.push(
      `    <part id="${objectId}" subtype="normal_part">\n`,
      `      <metadata key="name" value="${escapeXml(mesh.name)}"/>\n`,
      `      <metadata key="extruder" value="${extruder}"/>\n`,
      `      <mesh_stat face_count="${mesh.triangles.length / 3}" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>\n`,
      "    </part>\n",
    )
  }

  settings.push(
    "  </object>\n",
    "  <assemble>\n",
    "  </assemble>\n",
    "</config>\n",
  )
  return settings.join("")
}

export const createThreeMf = ({
  box,
  labels,
  boxColor,
  labelColor,
  title,
}: CreateThreeMfOptions): Uint8Array => {
  const model: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>\n',
    '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n',
    `  <metadata name="Title">${escapeXml(title)}</metadata>\n`,
    '  <metadata name="Designer">tscircuit</metadata>\n',
    '  <metadata name="Description">Labeled component-organization box generated from Circuit JSON</metadata>\n',
    '  <metadata name="Application">circuit-json-to-fdm-component-box</metadata>\n',
    "  <resources>\n",
    '    <basematerials id="1">\n',
    `      <base name="Box" displaycolor="${boxColor}" />\n`,
    `      <base name="Labels" displaycolor="${labelColor}" />\n`,
    "    </basematerials>\n",
  ]

  const meshes = [box, ...labels]
  for (const [index, mesh] of meshes.entries()) {
    appendMeshObject(model, mesh, index + 2)
  }

  const assemblyId = meshes.length + 2
  model.push(
    `    <object id="${assemblyId}" type="model" name="${escapeXml(title)}">\n`,
    "      <components>\n",
  )
  for (let objectId = 2; objectId < assemblyId; objectId += 1) {
    model.push(`        <component objectid="${objectId}" />\n`)
  }
  model.push(
    "      </components>\n",
    "    </object>\n",
    "  </resources>\n",
    "  <build>\n",
    `    <item objectid="${assemblyId}" />\n`,
    "  </build>\n",
    "</model>\n",
  )

  const bambuModelSettings = createBambuModelSettings(meshes, assemblyId, title)

  return zipSync(
    {
      "[Content_Types].xml": strToU8(CONTENT_TYPES_XML),
      "_rels/.rels": strToU8(RELATIONSHIPS_XML),
      "3D/3dmodel.model": strToU8(model.join("")),
      "Metadata/model_settings.config": strToU8(bambuModelSettings),
    },
    {
      level: 6,
      // ZIP timestamps are local-time based; January 2 stays within the ZIP
      // epoch in every UTC offset while keeping output deterministic.
      mtime: new Date("1980-01-02T00:00:00.000Z"),
    },
  )
}
