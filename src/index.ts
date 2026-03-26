import Fastify from "fastify";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { MESSAGING_PROVIDER, pool, DATABASE_URL } from "./config.js";
import { createConsoleProvider } from "./providers/messaging/console.js";
import { createWhatsAppProvider } from "./providers/messaging/whatsapp.js";
import { createTelegramProvider } from "./providers/messaging/telegram.js";
import { createPgVectorMemoryStore } from "./providers/memory/pgvector.js";
import { buildGraph } from "./graph/graph.js";
import { registerWebhookRoutes } from "./webhook/routes.js";
import { startTelegramPolling } from "./webhook/telegramPoller.js";

const app = Fastify({ logger: true });

const messaging =
  MESSAGING_PROVIDER === "telegram"
    ? createTelegramProvider()
    : MESSAGING_PROVIDER === "console"
      ? createConsoleProvider()
      : createWhatsAppProvider();

const memory = createPgVectorMemoryStore(pool);

const checkpointer = PostgresSaver.fromConnString(DATABASE_URL);
await checkpointer.setup();

const graph = buildGraph({ messaging, memory, checkpointer });

await registerWebhookRoutes(app, graph, messaging);

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
console.log(`Server listening on port ${port}`);

if (MESSAGING_PROVIDER === "telegram") {
  // Non-blocking — polling runs in background, server still listens for health checks
  startTelegramPolling(graph, messaging).catch(console.error);
  console.log("[telegram] polling active — send your bot a message to test");
}
