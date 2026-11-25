import { describe, expect, it } from "vitest";
import { formatEnumLabel } from "@/server/services/dashboard";

describe("dashboard helpers", () => {
  it("formats enum labels cleanly", () => {
    expect(formatEnumLabel("REMOTE")).toBe("Remote");
    expect(formatEnumLabel("HYBRID")).toBe("Hybrid");
    expect(formatEnumLabel("ONSITE")).toBe("Onsite");
    expect(formatEnumLabel("ENTRY")).toBe("Entry");
    expect(formatEnumLabel("UNKNOWN")).toBe("Unknown");
  });
});
