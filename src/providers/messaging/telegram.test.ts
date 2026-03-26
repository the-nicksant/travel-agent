import { describe, it, expect, vi, beforeEach } from "vitest";

// Must mock config before importing the provider
vi.mock("../../config.js", () => ({
  TELEGRAM_BOT_TOKEN: "test-token",
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("createTelegramProvider", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("sendText calls sendMessage with correct chat_id and text", async () => {
    const { createTelegramProvider } = await import("./telegram.js");
    const provider = createTelegramProvider();

    await provider.sendText({ to: "12345678", text: "Hello Tokyo!" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.telegram.org/bottest-token/sendMessage",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ chat_id: "12345678", text: "Hello Tokyo!" }),
      }),
    );
  });

  it("sendTemplate falls back to plain text", async () => {
    const { createTelegramProvider } = await import("./telegram.js");
    const provider = createTelegramProvider();

    await provider.sendTemplate({ to: "12345678", templateName: "welcome", params: ["Tokyo"] });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/sendMessage"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ chat_id: "12345678", text: "welcome: Tokyo" }),
      }),
    );
  });

  it("does not throw when API returns non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400, text: vi.fn().mockResolvedValue("Bad Request") });
    const { createTelegramProvider } = await import("./telegram.js");
    const provider = createTelegramProvider();

    await expect(provider.sendText({ to: "12345678", text: "Hi" })).resolves.not.toThrow();
  });
});
