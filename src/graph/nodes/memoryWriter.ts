import { ChatOpenAI } from "@langchain/openai";
import type { BaseMessage } from "@langchain/core/messages";
import type { IMemoryStore } from "../../interfaces/memory.js";
import type { TripState } from "../state.js";

const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });

const EXTRACTOR_PROMPT = `Extract 0-3 factual memories from this conversation exchange.
Only extract things worth remembering across days: preferences, dislikes, visited places, budget info, dietary needs.
Return ONLY a valid JSON array of strings. Return [] if nothing is worth saving.
No explanation, no preamble — only the JSON array.

User: {userMessage}
Agent: {agentReply}`;

export function createMemoryWriterNode(memory: IMemoryStore) {
  return async function memoryWriterNode(
    state: TripState,
  ): Promise<Partial<TripState>> {
    const lastAgent =
      state.messages.findLast((m: BaseMessage) => m.getType() === "ai")
        ?.content ?? "";

    try {
      const result = await llm.invoke(
        EXTRACTOR_PROMPT.replace("{userMessage}", state.lastMessage).replace(
          "{agentReply}",
          String(lastAgent),
        ),
      );

      const raw =
        typeof result.content === "string" ? result.content.trim() : "[]";
      const memories: string[] = JSON.parse(raw);

      await Promise.all(memories.map((m) => memory.upsert(state.userPhone, m)));
    } catch (err) {
      console.error("[memoryWriter]", err);
    }

    return {};
  };
}
