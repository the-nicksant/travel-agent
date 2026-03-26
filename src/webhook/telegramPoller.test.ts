import { describe, it, expect } from "vitest";
import { parseTelegramUpdate } from "./telegramPoller.js";

describe("parseTelegramUpdate", () => {
  it("parses a text message", () => {
    const update = {
      update_id: 100,
      message: {
        chat: { id: 987654321 },
        text: "Find me ramen near Shinjuku",
      },
    };

    const result = parseTelegramUpdate(update);

    expect(result).toEqual({
      updateId: "100",
      userPhone: "987654321",
      lastMessage: "Find me ramen near Shinjuku",
      messageType: "text",
    });
  });

  it("parses a location message", () => {
    const update = {
      update_id: 101,
      message: {
        chat: { id: 987654321 },
        location: { latitude: 35.6762, longitude: 139.6503 },
      },
    };

    const result = parseTelegramUpdate(update);

    expect(result).toEqual({
      updateId: "101",
      userPhone: "987654321",
      lastMessage: "[location shared: 35.6762,139.6503]",
      messageType: "location",
    });
  });

  it("parses a photo message", () => {
    const update = {
      update_id: 102,
      message: {
        chat: { id: 987654321 },
        caption: "What is this sign?",
        photo: [
          { file_id: "small_id", width: 320, height: 240 },
          { file_id: "large_id", width: 800, height: 600 },
        ],
      },
    };

    const result = parseTelegramUpdate(update);

    expect(result).toMatchObject({
      updateId: "102",
      userPhone: "987654321",
      lastMessage: "What is this sign?",
      messageType: "image",
    });
  });

  it("returns null for unsupported update types (e.g. edited_message)", () => {
    const update = {
      update_id: 103,
      edited_message: { chat: { id: 987654321 }, text: "edited" },
    };

    expect(parseTelegramUpdate(update)).toBeNull();
  });

  it("returns null for messages with no text, location, or photo", () => {
    const update = {
      update_id: 104,
      message: { chat: { id: 987654321 }, sticker: { file_id: "sticker_id" } },
    };

    expect(parseTelegramUpdate(update)).toBeNull();
  });

  it("returns null for message missing chat.id", () => {
    const update = {
      update_id: 105,
      message: { text: "hello" }, // no chat field
    };
    expect(parseTelegramUpdate(update)).toBeNull();
  });
});
