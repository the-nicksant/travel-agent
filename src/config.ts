import "dotenv/config";
import { Pool } from "pg";

const required = [
  "OPENAI_API_KEY",
  "DATABASE_URL",
  "REDIS_URL",
];

// WhatsApp vars only required when not using console provider
if (process.env.MESSAGING_PROVIDER !== "console") {
  required.push("WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID");
}

if (process.env.MESSAGING_PROVIDER === "telegram") {
  required.push("TELEGRAM_BOT_TOKEN");
}

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN ?? "";
export const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
export const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "local-dev-token";
export const MESSAGING_PROVIDER = process.env.MESSAGING_PROVIDER ?? "console";
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

export const REDIS_URL = process.env.REDIS_URL!;

export const DATABASE_URL = process.env.DATABASE_URL!;

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
