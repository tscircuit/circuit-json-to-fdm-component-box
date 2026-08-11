#!/usr/bin/env bun

import { readFile, writeFile } from "node:fs/promises"
import type { CircuitJson } from "circuit-json"
import { createFdmComponentBox } from "./create-fdm-component-box"
import type { FdmComponentBoxOptions } from "./types"

const HELP = `Usage:
  circuit-json-to-fdm-component-box <input.json> <output.3mf> [options]

Options:
  --columns <count>
  --compartment-width <mm>
  --compartment-depth <mm>
  --compartment-height <mm>
  --wall-thickness <mm>
  --floor-thickness <mm>
  --label-band-depth <mm>
  --label-thickness <mm>
  --label-padding <mm>
  --minimum-label-stroke-width <mm>
  --box-color <#RRGGBB[AA]>
  --label-color <#RRGGBB[AA]>
  --title <text>
  --include-unplaced
  --help
`

const numberFlags: Record<string, keyof FdmComponentBoxOptions> = {
  "--columns": "columns",
  "--compartment-width": "compartmentWidth",
  "--compartment-depth": "compartmentDepth",
  "--compartment-height": "compartmentHeight",
  "--wall-thickness": "wallThickness",
  "--floor-thickness": "floorThickness",
  "--label-band-depth": "labelBandDepth",
  "--label-thickness": "labelThickness",
  "--label-padding": "labelPadding",
  "--minimum-label-stroke-width": "minimumLabelStrokeWidth",
}

const stringFlags: Record<string, keyof FdmComponentBoxOptions> = {
  "--box-color": "boxColor",
  "--label-color": "labelColor",
  "--title": "title",
}

const parseOptions = (args: string[]): FdmComponentBoxOptions => {
  const options: FdmComponentBoxOptions = {}

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index]!
    if (flag === "--include-unplaced") {
      options.includeUnplacedComponents = true
      continue
    }

    const nextValue = args[index + 1]
    if (!nextValue) throw new Error(`Missing value for ${flag}`)

    const numberKey = numberFlags[flag]
    if (numberKey) {
      const value = Number(nextValue)
      if (!Number.isFinite(value)) throw new Error(`Invalid number for ${flag}`)
      Object.assign(options, { [numberKey]: value })
      index += 1
      continue
    }

    const stringKey = stringFlags[flag]
    if (stringKey) {
      Object.assign(options, { [stringKey]: nextValue })
      index += 1
      continue
    }

    throw new Error(`Unknown option: ${flag}`)
  }

  return options
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  if (args.includes("--help") || args.length === 0) {
    console.log(HELP)
    return
  }

  const [inputPath, outputPath, ...optionArgs] = args
  if (!inputPath || !outputPath) throw new Error(HELP)

  const parsed = JSON.parse(await readFile(inputPath, "utf8")) as unknown
  if (!Array.isArray(parsed))
    throw new TypeError("Input Circuit JSON must be an array")

  const result = await createFdmComponentBox(
    parsed as CircuitJson,
    parseOptions(optionArgs),
  )
  await writeFile(outputPath, result.threeMf)

  console.log(
    `Wrote ${outputPath}: ${result.componentRefdes.length} compartments, ${result.dimensions.width.toFixed(1)} × ${result.dimensions.depth.toFixed(1)} × ${result.dimensions.height.toFixed(1)} mm`,
  )
}

await main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
