import type { CircuitJson } from "circuit-json"

export const sampleCircuitJson = [
  {
    type: "source_component",
    source_component_id: "source_resistor_10",
    name: "R10",
    ftype: "simple_resistor",
  },
  {
    type: "source_component",
    source_component_id: "source_capacitor_1",
    name: "C1",
    ftype: "simple_capacitor",
  },
  {
    type: "source_component",
    source_component_id: "source_chip_2",
    name: "U2",
    ftype: "simple_chip",
  },
  {
    type: "source_component",
    source_component_id: "source_resistor_1",
    name: "R1",
    ftype: "simple_resistor",
  },
  {
    type: "source_component",
    source_component_id: "source_testpoint_1",
    name: "TP1",
    ftype: "simple_test_point",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_r10",
    source_component_id: "source_resistor_10",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_c1",
    source_component_id: "source_capacitor_1",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_u2",
    source_component_id: "source_chip_2",
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_r1",
    source_component_id: "source_resistor_1",
  },
] as unknown as CircuitJson

export const sourceOnlyCircuitJson = sampleCircuitJson.filter(
  (element) => element.type === "source_component",
) as CircuitJson
