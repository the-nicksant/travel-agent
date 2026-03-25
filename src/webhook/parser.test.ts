import { describe, it, expect } from "vitest";
import { parseMessage } from "./parser.js";

describe("parseMessage", () => {
  it("parses text messages", () => {
    const msg = { type: "text", text: { body: "Hello!" } };
    expect(parseMessage(msg)).toEqual({
      lastMessage: "Hello!",
      messageType: "text",
    });
  });

  it("parses image messages", () => {
    const msg = { type: "image", image: { id: "img-123" } };
    expect(parseMessage(msg)).toEqual({
      lastMessage: "[image received]",
      messageType: "image",
      imageUrl: "img-123",
    });
  });

  it("parses location messages with name", () => {
    const msg = { type: "location", location: { latitude: -23.5, longitude: -46.6, name: "São Paulo" } };
    const result = parseMessage(msg);
    expect(result.messageType).toBe("location");
    expect(result.currentCity).toBe("São Paulo");
    expect(result.lastMessage).toContain("São Paulo");
  });

  it("parses location messages without name (falls back to coordinates)", () => {
    const msg = { type: "location", location: { latitude: -23.5, longitude: -46.6 } };
    const result = parseMessage(msg);
    expect(result.lastMessage).toContain("-23.5,-46.6");
    expect(result.currentCity).toBeUndefined();
  });

  it("parses interactive button replies", () => {
    const msg = { type: "interactive", interactive: { button_reply: { title: "Yes" } } };
    expect(parseMessage(msg)).toEqual({
      lastMessage: "Yes",
      messageType: "interactive",
    });
  });

  it("handles unknown message types gracefully", () => {
    const msg = { type: "sticker" };
    expect(parseMessage(msg)).toEqual({
      lastMessage: "[unsupported message type]",
      messageType: "text",
    });
  });
});
