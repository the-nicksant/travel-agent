import type { IMessagingProvider, OutboundMessage, TemplateMessage } from "../../interfaces/messaging.js";
import { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID } from "../../config.js";

export function createWhatsAppProvider(): IMessagingProvider {
  const BASE_URL = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const headers = {
    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    "Content-Type": "application/json",
  };

  return {
    async sendText({ to, text }: OutboundMessage): Promise<void> {
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      });
      if (!res.ok) console.error("[whatsapp] sendText failed", await res.text());
    },

    async sendTemplate({ to, templateName, params }: TemplateMessage): Promise<void> {
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: params.map((p) => ({ type: "text", text: p })),
              },
            ],
          },
        }),
      });
      if (!res.ok) console.error("[whatsapp] sendTemplate failed", await res.text());
    },
  };
}
