import type {
  IMessagingProvider,
  OutboundMessage,
  TemplateMessage,
} from "../../interfaces/messaging.js";
import { TELEGRAM_BOT_TOKEN } from "../../config.js";

export function createTelegramProvider(): IMessagingProvider {
  const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

  return {
    async sendText({ to, text }: OutboundMessage): Promise<void> {
      try {
        const res = await fetch(`${baseUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: to, text }),
        });
        if (!res.ok) {
          console.error("[telegram:sendText] API error", res.status, await res.text());
        }
      } catch (err) {
        console.error("[telegram:sendText]", err);
      }
    },

    async sendTemplate({ to, templateName, params }: TemplateMessage): Promise<void> {
      // Telegram has no template concept — fall back to plain text
      const text = params.length > 0 ? `${templateName}: ${params.join(", ")}` : templateName;
      await this.sendText({ to, text });
    },
  };
}
