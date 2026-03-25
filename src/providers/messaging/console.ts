import type { IMessagingProvider, OutboundMessage, TemplateMessage } from "../../interfaces/messaging.js";

export function createConsoleProvider(): IMessagingProvider {
  return {
    async sendText({ to, text }: OutboundMessage): Promise<void> {
      console.log(`[MSG → ${to}]: ${text}`);
    },
    async sendTemplate({ to, templateName, params }: TemplateMessage): Promise<void> {
      console.log(`[TEMPLATE → ${to}]: ${templateName} ${JSON.stringify(params)}`);
    },
  };
}
