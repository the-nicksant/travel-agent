import { describe, it, expect } from "vitest";
import { RouteSchema } from "./supervisor.js";

describe("RouteSchema", () => {
  it("accepts valid routes", () => {
    expect(() =>
      RouteSchema.parse({ next: "context_agent", reasoning: "needs history" })
    ).not.toThrow();
    expect(() =>
      RouteSchema.parse({ next: "response_agent", reasoning: "ready to reply" })
    ).not.toThrow();
  });

  it("rejects invalid routes", () => {
    expect(() =>
      RouteSchema.parse({ next: "unknown_agent", reasoning: "?" })
    ).toThrow();
  });
});
