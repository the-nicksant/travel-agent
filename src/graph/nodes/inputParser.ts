import type { TripState } from "../state.js";

/**
 * Placeholder for message normalization.
 * Currently a no-op — reserved for future reverse-geocode logic
 * when messageType is "location" and currentCity is empty.
 */
export async function inputParserNode(
  _state: TripState,
): Promise<Partial<TripState>> {
  return {};
}
