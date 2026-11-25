import { describe, expect, it } from "vitest";
import { JobsQuerySchema } from "@/server/schemas";
import { formatJobSourceLabel } from "@/server/services/jobs";

describe("jobs query schema and helpers", () => {
  it("parses valid query params with defaults", () => {
    const parsed = JobsQuerySchema.parse({});
    expect(parsed).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it("parses filters and coerces pagination numbers", () => {
    const parsed = JobsQuerySchema.parse({
      q: "  react  ",
      roleId: "role_1",
      workMode: "REMOTE",
      level: "ENTRY",
      page: "3",
      pageSize: "10",
    });
    expect(parsed).toEqual({
      q: "react",
      roleId: "role_1",
      workMode: "REMOTE",
      level: "ENTRY",
      page: 3,
      pageSize: 10,
    });
  });

  it("rejects invalid workMode, level, or out-of-range pageSize", () => {
    expect(() => JobsQuerySchema.parse({ workMode: "OTHER" })).toThrow();
    expect(() => JobsQuerySchema.parse({ level: "EXECUTIVE" })).toThrow();
    expect(() => JobsQuerySchema.parse({ pageSize: "200" })).toThrow();
    expect(() => JobsQuerySchema.parse({ page: "0" })).toThrow();
  });

  it("formats source labels consistently", () => {
    expect(formatJobSourceLabel("sample", "Kaggle Tech Jobs")).toBe(
      "Source: Kaggle Tech Jobs · sample"
    );
    expect(formatJobSourceLabel("manual-bd", "Kaggle Tech Jobs")).toBe(
      "Source: Kaggle Tech Jobs · manual-bd"
    );
    expect(formatJobSourceLabel("kaggle:tech", "Kaggle Tech Jobs")).toBe(
      "Source: Kaggle Tech Jobs"
    );
  });
});
