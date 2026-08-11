# circuit-json-to-fdm-component-box

Generate a labeled component-organization tray from Circuit JSON as a
multi-material 3MF file. Each physical PCB component receives one open
compartment, and its refdes (`R1`, `C1`, `U1`, and so on) is raised on the solid
band immediately behind that compartment.

The box and labels are generated as robust meshes with
[`manifold-3d`](https://github.com/elalish/manifold). The 3MF contains one
assembly with separate `Box` and individually named `Label <refdes>` parts.
Core 3MF base materials assign the box and all labels to different materials,
and Bambu Studio metadata assigns the box to extruder 1 and the labels to
extruder 2. Other slicers can use the standard material assignments even if
they ignore Bambu's optional metadata.

## Install

This repository follows tscircuit's source-first package layout:

```sh
bun add github:tscircuit/circuit-json-to-fdm-component-box
```

## API

```ts
import { writeFile } from "node:fs/promises"
import { createFdmComponentBox } from "circuit-json-to-fdm-component-box"

const circuitJson = JSON.parse(await Bun.file("circuit.json").text())
const result = await createFdmComponentBox(circuitJson, {
  columns: 4,
  compartmentWidth: 28,
  compartmentDepth: 24,
})

await writeFile("assembly-box.3mf", result.threeMf)
console.log(result.dimensions, result.componentRefdes)
```

For bytes only:

```ts
import { circuitJsonToFdmComponentBox } from "circuit-json-to-fdm-component-box"

const threeMf = await circuitJsonToFdmComponentBox(circuitJson)
```

## CLI

```sh
bunx circuit-json-to-fdm-component-box circuit.json assembly-box.3mf
```

Run with `--help` to see geometry, color, and component-selection options.

## Geometry defaults

All dimensions are millimetres.

| Option | Default | Meaning |
| --- | ---: | --- |
| `compartmentWidth` | 26 | Clear pocket width |
| `compartmentDepth` | 22 | Clear pocket depth |
| `compartmentHeight` | 12 | Pocket depth from floor to rim |
| `wallThickness` | 1.6 | Outside and divider wall thickness |
| `floorThickness` | 1.6 | Material beneath each pocket |
| `labelBandDepth` | 6.5 | Solid band carrying each label |
| `labelThickness` | 0.6 | Raised text height |

The layout defaults to a near-square number of columns. A short final row gets a
shorter outline instead of blank compartments, so every generated compartment
corresponds to a component.

If the Circuit JSON contains `pcb_component` records, only linked
`source_component` records are included by default. This avoids pockets for
non-physical source elements and parts marked `do_not_place`. Source-only
documents fall back to all source components; pass
`includeUnplacedComponents: true` to request that behavior when PCB records are
present.

## Slicer workflow

1. Import the generated `.3mf` as one object with multiple parts.
2. Map extruder 1 (`Box`) to the structural filament.
3. Map extruder 2 (`Label ...`) to the contrasting filament or AMS slot.
4. Slice normally; the label meshes start exactly on the box's top surface.

The vector label alphabet supports letters, numbers, and common refdes
punctuation. Generation fails with a useful error if a refdes contains an
unsupported character or would require a stroke thinner than
`minimumLabelStrokeWidth`.

## Development

```sh
bun install
bun run typecheck
bun test
bun run format:check
```
