import { describe, it, expect, vi } from "vitest";
import { createContextNode } from "./context.js";
import type { IMemoryStore } from "../../interfaces/memory.js";

const mockMemory: IMemoryStore = {
  upsert: vi.fn(),
  search: vi.fn().mockResolvedValue(["User loves spicy food", "User hates crowds"]),
};

const baseState = {
  messages: [],
  lastMessage: "find me a good restaurant",
  messageType: "text" as const,
  next: "",
  userPhone: "+5511999999999",
  tripName: "Japan 2026",
  currentCity: "Tokyo",
  tripStartDate: "",
  tripEndDate: "",
  retrievedMemories: [],
  imageUrl: undefined,
  budgetTotal: undefined,
  budgetCurrency: "BRL",
  routingReason: "",
};

describe("createContextNode", () => {
  it("searches memory and returns results + routes back to supervisor", async () => {
    const contextNode = createContextNode(mockMemory);
    const result = await contextNode(baseState);

    expect(mockMemory.search).toHaveBeenCalledWith({
      userPhone: "+5511999999999",
      query: "find me a good restaurant",
      topK: 5,
      minScore: 0.75,
    });
    expect(result.retrievedMemories).toEqual(["User loves spicy food", "User hates crowds"]);
    expect(result.next).toBe("supervisor");
  });

  it("returns empty array and routes to supervisor on memory error", async () => {
    const brokenMemory: IMemoryStore = {
      upsert: vi.fn(),
      search: vi.fn().mockRejectedValue(new Error("DB down")),
    };
    const contextNode = createContextNode(brokenMemory);
    const result = await contextNode(baseState);

    expect(result.retrievedMemories).toEqual([]);
    expect(result.next).toBe("supervisor");
  });
});
