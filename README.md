# circuit-json-to-fdm-component-box

[Open the web converter](https://circuit-json-to-fdm-component-box.vercel.app/) to
upload Circuit JSON, preview the generated component box, and download a 3MF.

Generate a labeled component-organization tray from Circuit JSON as a
multi-material 3MF file. Each populated PCB component is assigned to an open
compartment, and its refdes (`R1`, `C1`, `U1`, and so on) is raised on the solid
band immediately behind that compartment.

Components with the same confident BOM identity share a compartment by default.
The full refdes list remains available in the result, while the printable label
uses the full list, a range such as `C1-6`, or a compact quantity label such as
`C_ADC+8`, depending on the available space.

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
console.log(result.dimensions, result.componentGroups)
```

For bytes only:

```ts
import { circuitJsonToFdmComponentBox } from "circuit-json-to-fdm-component-box"

const threeMf = await circuitJsonToFdmComponentBox(circuitJson)
```

For a deterministic PNG preview rendered in pure JavaScript with
[`poppygl`](https://github.com/tscircuit/poppygl):

```ts
import { renderFdmComponentBoxPng } from "circuit-json-to-fdm-component-box"

const png = await renderFdmComponentBoxPng(
  circuitJson,
  { columns: 4 },
  { width: 800, height: 600 },
)
await writeFile("assembly-box.png", png)
```

## CLI

```sh
bunx circuit-json-to-fdm-component-box circuit.json assembly-box.3mf
```

Run with `--help` to see geometry, color, and component-selection options.
Use `--no-group-components` to force one compartment per refdes,
`--include-unplaced` to include source-only parts, or `--include-test-points` to
include test points.

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

## BOM grouping

If the Circuit JSON contains `pcb_component` records, only linked, populated
`source_component` records are included by default. This avoids pockets for
non-physical source elements, test points, and parts marked `do_not_place`.
Source-only documents fall back to their source components.

Grouping is deliberately conservative, in this order:

1. Matching `manufacturer_part_number` values.
2. Matching preferred supplier part numbers, such as JLCPCB/LCSC numbers.
3. Matching resistor, capacitor, or inductor value plus footprint/package.
4. Otherwise, one compartment per source component.

Pass `groupByComponent: false`, `includeUnplacedComponents: true`, or
`includeTestPoints: true` to override those defaults. Each
`CompartmentPlacement` includes `referenceDesignators`, `quantity`, the physical
`label`, and its `componentKey`.

## Slicer workflow

1. Import the generated `.3mf` as one object with multiple parts.
2. Map extruder 1 (`Box`) to the structural filament.
3. Map extruder 2 (`Label ...`) to the contrasting filament or AMS slot.
4. Slice normally; the label meshes start exactly on the box's top surface.

The vector label alphabet supports letters, numbers, and common refdes
punctuation. Generation fails with a useful error if a refdes contains an
unsupported character or would require a stroke thinner than
`minimumLabelStrokeWidth`. Long underscore-delimited refdes values are shortened
from their tokens while their exact values remain in the 3MF part name and API
result. Generation also rejects ambiguous shortened labels.

## Visual snapshots

The PNG snapshot suite renders the generated manifold meshes with PoppyGL and
compares them through `@tscircuit/image-utils/looks-same`. Its matcher follows
the `bun-match-svg` update/diff convention and writes magenta `.diff.png` files
next to failed snapshots.

The larger fixture is a BOM-shaped Circuit JSON subset pinned from
[`abse/gameboy` v1.0.16](https://tscircuit.com/abse/gameboy). It verifies that 78
populated components collapse into 40 labeled compartments.

## Development

```sh
bun install
bun run typecheck
bun test
bun run format:check
bun run snapshot:update # intentionally replace PNG baselines
```
