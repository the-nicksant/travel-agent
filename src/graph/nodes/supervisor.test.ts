import { describe, it, expect } from "vitest";
import { z } from "zod";

// Test the routing schema contract independently of the LLM
const RouteSchema = z.object({
  next: z.enum(["context_agent", "action_agent", "response_agent", "END"]),
  reasoning: z.string(),
});

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
