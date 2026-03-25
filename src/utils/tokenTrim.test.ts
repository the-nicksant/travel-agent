import { describe, it, expect } from "vitest";
import { trimForContext } from "./tokenTrim.js";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

describe("trimForContext", () => {
  it("returns all messages when under token limit", async () => {
    const messages = [
      new HumanMessage("Hello"),
      new AIMessage("Hi there"),
    ];
    const result = await trimForContext(messages);
    expect(result.length).toBe(2);
  });

  it("trims to most recent messages when over limit", async () => {
    // Create 200 messages to exceed the 12000 token limit
    const messages = Array.from({ length: 200 }, (_, i) =>
      new HumanMessage("x".repeat(300)) // ~75 tokens each, 200 * 75 = 15000 > 12000
    );
    const result = await trimForContext(messages);
    expect(result.length).toBeLessThan(200);
  });
});
