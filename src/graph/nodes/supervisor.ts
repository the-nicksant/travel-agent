import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { TripState } from "../state.js";

export const RouteSchema = z.object({
  next: z.enum(["context_agent", "action_agent", "response_agent", "END"]),
  reasoning: z.string(),
});

const SUPERVISOR_PROMPT = `You are the routing brain of a WhatsApp travel assistant.
Given the user message and current state, decide which agent handles next.

- context_agent: ONLY if memoriesSearched=false AND past preferences/history would help answer
- action_agent: ONLY if actionsExecuted=false AND user needs real-time data (maps, weather, flights, currency)
- response_agent: ready to reply — use this when memoriesSearched=true OR actionsExecuted=true OR no lookup needed
- END: conversation is complete or user said goodbye

Trip: {tripName} | City: {currentCity}
Memory search already ran: {memoriesSearched}
Actions/tools already ran: {actionsExecuted}
Tool result available: {hasToolResult}

CRITICAL RULES:
- If memoriesSearched=true → do NOT route to context_agent
- If actionsExecuted=true → do NOT route to action_agent
- When in doubt → route to response_agent`;

export async function supervisorNode(
  state: TripState,
): Promise<Partial<TripState>> {
  const router = new ChatOpenAI({ model: "gpt-4o", temperature: 0 }).withStructuredOutput(RouteSchema);
  const result = await router.invoke([
    new SystemMessage(
      SUPERVISOR_PROMPT
        .replace("{tripName}", state.tripName || "unknown trip")
        .replace("{currentCity}", state.currentCity || "unknown city")
        .replace("{memoriesSearched}", String(state.memoriesSearched === true))
        .replace("{actionsExecuted}", String(state.actionsExecuted === true))
        .replace(
          "{hasToolResult}",
          // Tool result is always the last message when supervisor re-runs after actionAgent
          String(state.messages.at(-1)?.getType() === "tool"),
        ),
    ),
    new HumanMessage(state.lastMessage),
  ]);

  return { next: result.next, routingReason: result.reasoning };
}
