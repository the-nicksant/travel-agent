import { describe, it, expect, vi } from "vitest";
import { createMemoryWriterNode } from "./memoryWriter.js";
import type { IMemoryStore } from "../../interfaces/memory.js";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({ content: '["User hates spicy food"]' }),
  })),
}));

const mockMemory: IMemoryStore = {
  upsert: vi.fn().mockResolvedValue(undefined),
  search: vi.fn(),
};

const baseState = {
  messages: [
    new HumanMessage("I hate spicy food"),
    new AIMessage("Got it! I'll remember you prefer mild dishes."),
  ],
  lastMessage: "I hate spicy food",
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

describe("createMemoryWriterNode", () => {
  it("returns empty object (no state changes)", async () => {
    const memoryWriterNode = createMemoryWriterNode(mockMemory);
    const result = await memoryWriterNode(baseState);
    expect(result).toEqual({});
  });

  it("does not throw when upsert fails", async () => {
    const brokenMemory: IMemoryStore = {
      upsert: vi.fn().mockRejectedValue(new Error("DB down")),
      search: vi.fn(),
    };
    const memoryWriterNode = createMemoryWriterNode(brokenMemory);
    await expect(memoryWriterNode(baseState)).resolves.toEqual({});
  });
});
