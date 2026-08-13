import type { CircuitJson } from "circuit-json"
import { createFdmComponentBox, renderFdmComponentBoxPng } from "../lib/index"

const uploadArea = document.getElementById("uploadArea")!
const fileInput = document.getElementById("fileInput")! as HTMLInputElement
const fileInfo = document.getElementById("fileInfo")!
const convertButton = document.getElementById(
  "convertButton",
)! as HTMLButtonElement
const downloadButton = document.getElementById(
  "downloadButton",
)! as HTMLButtonElement
const clearButton = document.getElementById("clearButton")! as HTMLButtonElement
const status = document.getElementById("status")!
const preview = document.getElementById("preview")!
const previewImage = document.getElementById(
  "previewImage",
)! as HTMLImageElement

let currentFile: File | undefined
let currentCircuitJson: CircuitJson | undefined
let threeMfUrl: string | undefined
let previewUrl: string | undefined

const revokeGeneratedUrls = (): void => {
  if (threeMfUrl) URL.revokeObjectURL(threeMfUrl)
  if (previewUrl) URL.revokeObjectURL(previewUrl)
  threeMfUrl = undefined
  previewUrl = undefined
}

const resetOutput = (): void => {
  revokeGeneratedUrls()
  downloadButton.disabled = true
  preview.hidden = true
  previewImage.removeAttribute("src")
}

const setStatus = (message: string, isError = false): void => {
  status.textContent = message
  status.classList.toggle("error", isError)
}

const getOutputName = (): string => {
  const baseName = currentFile?.name.replace(/(?:\.circuit)?\.json$/i, "")
  return `${baseName || "component-box"}.3mf`
}

const loadFile = async (file: File): Promise<void> => {
  currentFile = file
  currentCircuitJson = undefined
  resetOutput()
  convertButton.disabled = true
  fileInfo.replaceChildren()
  setStatus("Reading file…")

  try {
    const parsed = JSON.parse(await file.text())
    if (!Array.isArray(parsed)) {
      throw new Error("Circuit JSON must be an array of circuit elements.")
    }

    currentCircuitJson = parsed as CircuitJson
    fileInfo.textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB`
    convertButton.disabled = false
    setStatus("Ready to convert.")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    setStatus(`Could not read this Circuit JSON: ${message}`, true)
  }
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0]
  if (file) void loadFile(file)
})

uploadArea.addEventListener("dragover", (event) => {
  event.preventDefault()
  uploadArea.classList.add("dragover")
})

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover")
})

uploadArea.addEventListener("drop", (event) => {
  event.preventDefault()
  uploadArea.classList.remove("dragover")
  const file = event.dataTransfer?.files[0]
  if (file) void loadFile(file)
})

convertButton.addEventListener("click", async () => {
  if (!currentCircuitJson) return

  resetOutput()
  convertButton.disabled = true
  setStatus("Generating component box and preview…")

  try {
    await new Promise((resolve) => setTimeout(resolve, 0))
    const options = { title: getOutputName().replace(/\.3mf$/, "") }
    const result = await createFdmComponentBox(currentCircuitJson, options)
    const png = await renderFdmComponentBoxPng(currentCircuitJson, options)

    threeMfUrl = URL.createObjectURL(
      new Blob([new Uint8Array(result.threeMf)], { type: "model/3mf" }),
    )
    previewUrl = URL.createObjectURL(
      new Blob([new Uint8Array(png)], { type: "image/png" }),
    )
    previewImage.src = previewUrl
    preview.hidden = false
    downloadButton.disabled = false
    setStatus(
      `Created ${result.compartments.length} compartments for ${result.componentRefdes.length} components.`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    setStatus(`Conversion failed: ${message}`, true)
  } finally {
    convertButton.disabled = false
  }
})

downloadButton.addEventListener("click", () => {
  if (!threeMfUrl) return
  const link = document.createElement("a")
  link.href = threeMfUrl
  link.download = getOutputName()
  link.click()
})

clearButton.addEventListener("click", () => {
  currentFile = undefined
  currentCircuitJson = undefined
  fileInput.value = ""
  fileInfo.replaceChildren()
  convertButton.disabled = true
  resetOutput()
  setStatus("")
})

window.addEventListener("beforeunload", revokeGeneratedUrls)
