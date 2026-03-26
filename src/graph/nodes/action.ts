import type { TripState } from "../state.js";

/**
 * Action node — executes tool calls.
 * Phase 2 stub: returns to supervisor without executing any tools.
 * Tools will be bound here in Phase 3.
 */
export async function actionNode(
  _state: TripState,
): Promise<Partial<TripState>> {
  // Phase 3: bind allTools via llm.bindTools(allTools) and run ToolNode here
  return { actionsExecuted: true, next: "supervisor" };
}
