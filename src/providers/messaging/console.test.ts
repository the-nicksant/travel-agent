import { describe, it, expect, vi } from "vitest";
import { createConsoleProvider } from "./console.js";

describe("createConsoleProvider", () => {
  it("logs sendText to stdout", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const provider = createConsoleProvider();
    await provider.sendText({ to: "+5511999999999", text: "Hello there" });
    expect(spy).toHaveBeenCalledWith("[MSG → +5511999999999]: Hello there");
    spy.mockRestore();
  });

  it("logs sendTemplate to stdout", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const provider = createConsoleProvider();
    await provider.sendTemplate({ to: "+5511999999999", templateName: "welcome", params: ["Alice"] });
    expect(spy).toHaveBeenCalledWith('[TEMPLATE → +5511999999999]: welcome ["Alice"]');
    spy.mockRestore();
  });
});
