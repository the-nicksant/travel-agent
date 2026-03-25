import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { trimForContext } from "../../utils/tokenTrim.js";
import type { IMessagingProvider } from "../../interfaces/messaging.js";
import type { TripState } from "../state.js";

const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0.3 });

function buildSystemPrompt(state: TripState): string {
  const memories =
    state.retrievedMemories.length > 0
      ? state.retrievedMemories.join("\n")
      : "None yet.";

  return `You are a travel companion for ${state.tripName || "this trip"}. The user is in ${state.currentCity || "an unknown city"}.

Relevant memories about this user:
${memories}

FORMATTING RULES (mandatory — never break these):
- This is a WhatsApp message. Do NOT use Markdown.
- No **bold**, no # headers, no - bullet points.
- Use *bold* and _italic_ for WhatsApp emphasis only.
- Keep replies short: max 3 short paragraphs.
- Never say "As an AI" or reference being a language model.`;
}

export function createResponseNode(messaging: IMessagingProvider) {
  return async function responseNode(
    state: TripState,
  ): Promise<Partial<TripState>> {
    const trimmed = await trimForContext(state.messages);

    const response = await llm.invoke([
      new SystemMessage(buildSystemPrompt(state)),
      ...trimmed,
      new HumanMessage(state.lastMessage),
    ]);

    const replyText =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    try {
      await messaging.sendText({ to: state.userPhone, text: replyText });
    } catch (err) {
      console.error("[responseNode] send failed", err);
    }

    return { messages: [response] };
  };
}
