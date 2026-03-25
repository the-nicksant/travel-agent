export type ParsedMessage = {
  lastMessage: string;
  messageType: "text" | "image" | "location" | "interactive";
  imageUrl?: string;
  currentCity?: string;
};

// TODO: type this — raw WhatsApp payload shape not yet typed
export function parseMessage(message: any): ParsedMessage {
  switch (message.type) {
    case "text":
      return { lastMessage: message.text.body, messageType: "text" };

    case "image":
      return {
        lastMessage: "[image received]",
        messageType: "image",
        imageUrl: message.image?.id,
      };

    case "location": {
      const { latitude, longitude, name } = message.location;
      return {
        lastMessage: `[location shared: ${name ?? `${latitude},${longitude}`}]`,
        messageType: "location",
        ...(name ? { currentCity: name } : {}),
      };
    }

    case "interactive":
      return {
        lastMessage: message.interactive?.button_reply?.title ?? "",
        messageType: "interactive",
      };

    default:
      return { lastMessage: "[unsupported message type]", messageType: "text" };
  }
}
