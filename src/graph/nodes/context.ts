import type { IMemoryStore } from "../../interfaces/memory.js";
import type { TripState } from "../state.js";

export function createContextNode(memory: IMemoryStore) {
  return async function contextNode(
    state: TripState,
  ): Promise<Partial<TripState>> {
    try {
      const memories = await memory.search({
        userPhone: state.userPhone,
        query: state.lastMessage,
        topK: 5,
        minScore: 0.5,
      });
      return { retrievedMemories: memories, memoriesSearched: true, next: "supervisor" };
    } catch (err) {
      console.error("[contextNode]", err);
      return { retrievedMemories: [], memoriesSearched: true, next: "supervisor" };
    }
  };
}
