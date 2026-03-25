import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

export const TripStateAnnotation = Annotation.Root({
  // Core conversation
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  lastMessage: Annotation<string>(),
  messageType: Annotation<"text" | "image" | "location" | "interactive">(),

  // Routing
  next: Annotation<string>(),

  // User + trip identity
  userPhone: Annotation<string>(),
  tripName: Annotation<string>(),
  currentCity: Annotation<string>(),
  tripStartDate: Annotation<string>(),
  tripEndDate: Annotation<string>(),

  // Injected context (populated by contextNode, consumed by responseNode)
  retrievedMemories: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  // Optional image URL for vision tool
  imageUrl: Annotation<string | undefined>(),

  // Budget (lightweight)
  budgetTotal: Annotation<number | undefined>(),
  budgetCurrency: Annotation<string>(),

  // Supervisor reasoning (kept for debugging)
  routingReason: Annotation<string>(),
});

export type TripState = typeof TripStateAnnotation.State;
