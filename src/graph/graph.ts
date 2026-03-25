import { StateGraph, END, START } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { TripStateAnnotation } from "./state.js";
import { inputParserNode } from "./nodes/inputParser.js";
import { supervisorNode } from "./nodes/supervisor.js";
import { createContextNode } from "./nodes/context.js";
import { actionNode } from "./nodes/action.js";
import { createResponseNode } from "./nodes/response.js";
import { createMemoryWriterNode } from "./nodes/memoryWriter.js";
import type { IMessagingProvider } from "../interfaces/messaging.js";
import type { IMemoryStore } from "../interfaces/memory.js";

export function buildGraph(deps: {
  messaging: IMessagingProvider;
  memory: IMemoryStore;
  checkpointer: BaseCheckpointSaver;
}) {
  const workflow = new StateGraph(TripStateAnnotation)
    .addNode("inputParser", inputParserNode)
    .addNode("supervisor", supervisorNode)
    .addNode("contextAgent", createContextNode(deps.memory))
    .addNode("actionAgent", actionNode)
    .addNode("responseAgent", createResponseNode(deps.messaging))
    .addNode("memoryWriter", createMemoryWriterNode(deps.memory))

    .addEdge(START, "inputParser")
    .addEdge("inputParser", "supervisor")

    .addConditionalEdges("supervisor", (state) => state.next, {
      context_agent: "contextAgent",
      action_agent: "actionAgent",
      response_agent: "responseAgent",
      END: END,
    })

    .addEdge("contextAgent", "supervisor")
    .addEdge("actionAgent", "supervisor")
    .addEdge("responseAgent", "memoryWriter")
    .addEdge("memoryWriter", END);

  return workflow.compile({ checkpointer: deps.checkpointer });
}
