import { describe, expect, test } from "bun:test"
import { formatComponentGroupLabel } from "lib/format-component-group-label"

describe("formatComponentGroupLabel", () => {
  test("preserves leading zeroes instead of collapsing distinct refdes", () => {
    expect(
      formatComponentGroupLabel(["R001", "R002", "R003"], {
        availableWidth: 12,
        availableHeight: 5,
        minimumStrokeWidth: 0.15,
      }),
    ).toBe("R001-003")

    expect(
      formatComponentGroupLabel(["R01", "R1"], {
        availableWidth: 6,
        availableHeight: 5,
        minimumStrokeWidth: 0.15,
      }),
    ).toBe("R01+1")
  })
})
