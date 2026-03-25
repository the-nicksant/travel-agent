import Fastify from "fastify";
import { MESSAGING_PROVIDER } from "./config.js";
import { createConsoleProvider } from "./providers/messaging/console.js";
import { createWhatsAppProvider } from "./providers/messaging/whatsapp.js";
import { registerWebhookRoutes } from "./webhook/routes.js";

const app = Fastify({ logger: true });

const messaging =
  MESSAGING_PROVIDER === "console"
    ? createConsoleProvider()
    : createWhatsAppProvider();

await registerWebhookRoutes(app, messaging);

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
console.log(`Server listening on port ${port}`);
