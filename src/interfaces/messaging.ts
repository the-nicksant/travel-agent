export interface OutboundMessage {
  to: string;
  text: string;
}

export interface TemplateMessage {
  to: string;
  templateName: string;
  params: string[];
}

export interface IMessagingProvider {
  sendText(message: OutboundMessage): Promise<void>;
  sendTemplate(message: TemplateMessage): Promise<void>;
}
