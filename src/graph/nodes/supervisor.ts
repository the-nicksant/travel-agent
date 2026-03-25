import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { TripState } from "../state.js";

const RouteSchema = z.object({
  next: z.enum(["context_agent", "action_agent", "response_agent", "END"]),
  reasoning: z.string(),
});

const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
const router = llm.withStructuredOutput(RouteSchema);

const SUPERVISOR_PROMPT = `You are the routing brain of a WhatsApp travel assistant.
Given the user message and current state, decide which agent handles next.

- context_agent: user references past events, preferences, or history would improve the answer
- action_agent: user needs real-time data (maps, weather, flights, currency, document parsing)
- response_agent: enough context exists to reply — no tool or memory lookup needed
- END: conversation is complete or user said goodbye

Trip: {tripName} | City: {currentCity}
Memories already loaded: {hasMemories}
Tool result available: {hasToolResult}

Route to response_agent if memories are already loaded and no tool is needed.
Do NOT route to action_agent in this phase — tools are not yet available.`;

export async function supervisorNode(
  state: TripState,
): Promise<Partial<TripState>> {
  const result = await router.invoke([
    new SystemMessage(
      SUPERVISOR_PROMPT
        .replace("{tripName}", state.tripName || "unknown trip")
        .replace("{currentCity}", state.currentCity || "unknown city")
        .replace("{hasMemories}", String(state.retrievedMemories.length > 0))
        .replace(
          "{hasToolResult}",
          String(state.messages.at(-1)?.getType() === "tool"),
        ),
    ),
    new HumanMessage(state.lastMessage),
  ]);

  return { next: result.next, routingReason: result.reasoning };
}
