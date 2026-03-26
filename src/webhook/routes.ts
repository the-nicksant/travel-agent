import type { FastifyInstance } from "fastify";
import type { buildGraph } from "../graph/graph.js";
import type { IMessagingProvider } from "../interfaces/messaging.js";
import { isDuplicate } from "../utils/dedup.js";
import { parseMessage } from "./parser.js";
import { WHATSAPP_VERIFY_TOKEN } from "../config.js";

type TravelGraph = ReturnType<typeof buildGraph>;

export function registerWebhookRoutes(
  app: FastifyInstance,
  graph: TravelGraph,
  messaging: IMessagingProvider,
) {
  app.get("/health", async () => ({ ok: true }));

  app.get("/webhook", async (req, reply) => {
    const q = req.query as Record<string, string>; // TODO: type this
    if (
      q["hub.mode"] === "subscribe" &&
      q["hub.verify_token"] === WHATSAPP_VERIFY_TOKEN
    ) {
      return reply.send(q["hub.challenge"]);
    }
    return reply.status(403).send("Forbidden");
  });

  app.post("/webhook", async (req, reply) => {
    // ACK immediately — Meta requires response within 5 seconds
    reply.status(200).send("OK");

    // Process async — do NOT await
    processIncoming(req.body, graph, messaging).catch(console.error);
  });
}

async function processIncoming(
  body: unknown,
  graph: TravelGraph,
  messaging: IMessagingProvider,
): Promise<void> {
  const entry = (body as any)?.entry?.[0]?.changes?.[0]?.value; // TODO: type this
  const message = entry?.messages?.[0];
  if (!message) return;

  const messageId = message.id as string;
  const userPhone = message.from as string;

  // Dedup — must be first
  if (await isDuplicate(messageId)) return;

  const { lastMessage, messageType, imageUrl, currentCity } = parseMessage(message);

  try {
    await graph.invoke(
      {
        lastMessage,
        messageType,
        imageUrl,
        userPhone,
        ...(currentCity ? { currentCity } : {}),
      },
      { configurable: { thread_id: userPhone } },
    );
  } catch (err) {
    console.error("[processIncoming] graph error:", err);
    await messaging.sendText({
      to: userPhone,
      text: "Sorry, something went wrong on my end. Please try again.",
    });
  }
}
