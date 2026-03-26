import type { buildGraph } from "../graph/graph.js";
import type { IMessagingProvider } from "../interfaces/messaging.js";
import { isDuplicate } from "../utils/dedup.js";
import { TELEGRAM_BOT_TOKEN } from "../config.js";

type TravelGraph = ReturnType<typeof buildGraph>;

export interface ParsedTelegramMessage {
  updateId: string;
  userPhone: string;
  lastMessage: string;
  messageType: "text" | "image" | "location" | "interactive";
  imageUrl?: string;
}

export function parseTelegramUpdate(update: any): ParsedTelegramMessage | null {
  // Only handle fresh messages, not edits or channel posts
  const message = update?.message;
  if (!message) return null;

  const userPhone = String(message.chat.id);
  const updateId = String(update.update_id);

  if (message.text) {
    return { updateId, userPhone, lastMessage: message.text, messageType: "text" };
  }

  if (message.location) {
    const { latitude, longitude } = message.location;
    return {
      updateId,
      userPhone,
      lastMessage: `[location shared: ${latitude},${longitude}]`,
      messageType: "location",
    };
  }

  if (message.photo) {
    // Telegram sends multiple resolutions — last is highest quality
    return {
      updateId,
      userPhone,
      lastMessage: message.caption ?? "[image received]",
      messageType: "image",
      // imageUrl deferred to Phase 3 (requires getFile API call)
    };
  }

  return null; // stickers, voice, video, etc — skip
}

export async function startTelegramPolling(
  graph: TravelGraph,
  messaging: IMessagingProvider,
): Promise<void> {
  const baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
  let offset = 0;

  console.log("[telegram] polling started");

  while (true) {
    try {
      const url = `${baseUrl}/getUpdates?offset=${offset}&timeout=30`;
      const res = await fetch(url);

      if (!res.ok) {
        console.error("[telegram] getUpdates failed", res.status, await res.text());
        await new Promise((r) => setTimeout(r, 5000)); // back off on error
        continue;
      }

      const data = (await res.json()) as { ok: boolean; result: any[] };
      if (!data.ok || data.result.length === 0) continue;

      for (const update of data.result) {
        offset = update.update_id + 1; // advance before processing to avoid reprocessing on crash

        const parsed = parseTelegramUpdate(update);
        if (!parsed) continue;

        if (await isDuplicate(parsed.updateId)) continue;

        try {
          await graph.invoke(
            {
              lastMessage: parsed.lastMessage,
              messageType: parsed.messageType,
              userPhone: parsed.userPhone,
              ...(parsed.imageUrl ? { imageUrl: parsed.imageUrl } : {}),
            },
            { configurable: { thread_id: parsed.userPhone } },
          );
        } catch (err) {
          console.error("[telegram] graph error:", err);
          await messaging.sendText({
            to: parsed.userPhone,
            text: "Sorry, something went wrong on my end. Please try again.",
          });
        }
      }
    } catch (err) {
      console.error("[telegram] polling error:", err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
