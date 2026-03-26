import type {
  IMessagingProvider,
  OutboundMessage,
  TemplateMessage,
} from "../../interfaces/messaging.js";
import { TELEGRAM_BOT_TOKEN } from "../../config.js";

export function createTelegramProvider(): IMessagingProvider {
  const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

  async function send(chatId: string, text: string): Promise<void> {
    try {
      const res = await fetch(`${baseUrl}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      if (!res.ok) {
        console.error("[telegram:send] API error", res.status, await res.text());
      }
    } catch (err) {
      console.error("[telegram:send]", err);
    }
  }

  return {
    async sendText({ to, text }: OutboundMessage): Promise<void> {
      await send(to, text);
    },

    async sendTemplate({ to, templateName, params }: TemplateMessage): Promise<void> {
      // Telegram has no template concept — fall back to plain text
      const text = params.length > 0 ? `${templateName}: ${params.join(", ")}` : templateName;
      await send(to, text);
    },
  };
}
