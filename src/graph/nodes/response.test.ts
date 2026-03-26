import { describe, it, expect, vi } from "vitest";
import { HumanMessage } from "@langchain/core/messages";
import { createResponseNode } from "./response.js";
import type { IMessagingProvider } from "../../interfaces/messaging.js";

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi
      .fn()
      .mockResolvedValue({ content: "Here are some quiet spots in Tokyo..." }),
  })),
}));

const mockMessaging: IMessagingProvider = {
  sendText: vi.fn().mockResolvedValue(undefined),
  sendTemplate: vi.fn(),
};

const baseState = {
  messages: [],
  lastMessage: "What should I visit in Tokyo?",
  messageType: "text" as const,
  next: "",
  userPhone: "+5511999999999",
  tripName: "Japan 2026",
  currentCity: "Tokyo",
  tripStartDate: "",
  tripEndDate: "",
  retrievedMemories: ["User hates crowded places"],
  memoriesSearched: true,
  actionsExecuted: false,
  imageUrl: undefined,
  budgetTotal: undefined,
  budgetCurrency: "BRL",
  routingReason: "",
};

describe("createResponseNode", () => {
  it("calls messaging.sendText with the generated reply", async () => {
    const responseNode = createResponseNode(mockMessaging);
    await responseNode(baseState);

    expect(mockMessaging.sendText).toHaveBeenCalledWith(
      expect.objectContaining({ to: "+5511999999999" }),
    );
  });

  it("stores both the human message and AI response in state.messages", async () => {
    const responseNode = createResponseNode(mockMessaging);
    const result = await responseNode(baseState);

    expect(result.messages).toHaveLength(2);
    expect(result.messages![0]).toBeInstanceOf(HumanMessage);
    expect(result.messages![1]).toMatchObject({ content: "Here are some quiet spots in Tokyo..." });
  });

  it("does not throw when sendText fails", async () => {
    const brokenMessaging: IMessagingProvider = {
      sendText: vi.fn().mockRejectedValue(new Error("WhatsApp API down")),
      sendTemplate: vi.fn(),
    };
    const responseNode = createResponseNode(brokenMessaging);
    await expect(responseNode(baseState)).resolves.toBeDefined();
  });
});
