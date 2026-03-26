import type { TripState } from "../state.js";

/**
 * Placeholder for message normalization.
 * Currently a no-op — reserved for future reverse-geocode logic
 * when messageType is "location" and currentCity is empty.
 */
export async function inputParserNode(
  _state: TripState,
): Promise<Partial<TripState>> {
  // Reset turn-level flags so each message starts fresh regardless of checkpoint state
  return { memoriesSearched: false, actionsExecuted: false };
}
