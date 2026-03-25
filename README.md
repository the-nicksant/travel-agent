# Travel Companion

A WhatsApp-native AI travel assistant. Send it a message while you're travelling and it remembers everything — your preferences, visited places, dietary needs, budget — and uses that context to give you personalized answers in real time.

Not a planning tool. Not an itinerary builder. It's the assistant you message when you're already there.

---

## What it does

- Answers questions with full trip context ("find me somewhere to eat" already knows you hate crowds and love ramen)
- Remembers everything across the trip using semantic memory (pgvector)
- Stateful conversation per user — picks up exactly where you left off
- Runs entirely through WhatsApp — no app to install, no account to create

**Not built (yet):** maps, weather, flights, currency, document OCR — those are Phase 3.

---

## How a message flows

```
WhatsApp → POST /webhook
  → Redis dedup (same message ID? drop it)
  → parseMessage (text / image / location / interactive)
  → graph.invoke (LangGraph state machine)
        ↓
     inputParser    normalizes the message
        ↓
     supervisor     GPT-4o decides: load memories? call a tool? reply now?
        ↓
     contextAgent?  searches pgvector for relevant memories about this user
        ↓
     actionAgent?   calls tools (Phase 3 — stub for now)
        ↓
     responseAgent  GPT-4o generates reply → sends via WhatsApp (or console)
        ↓
     memoryWriter   GPT-4o extracts facts → saves as embeddings for next time
```

The `supervisor` is the routing brain. For "what should I visit today?" it goes straight to `responseAgent`. For "find me a quiet restaurant" it hits `contextAgent` first to load preferences, then replies with context. Every conversation ends by saving memorable facts to pgvector.

---

## Architecture

Clean architecture — agent logic never imports from infrastructure.

```
src/
├── interfaces/          # IMessagingProvider, IMemoryStore — the only two contracts
├── providers/
│   ├── messaging/
│   │   ├── console.ts   # logs to stdout (local dev)
│   │   └── whatsapp.ts  # WhatsApp Cloud API (production)
│   └── memory/
│       └── pgvector.ts  # Postgres + pgvector (embeddings + similarity search)
├── graph/
│   ├── state.ts         # TripState — everything that flows through the graph
│   ├── graph.ts         # buildGraph() — wires nodes, compiles with PostgresSaver
│   └── nodes/
│       ├── supervisor.ts    # LLM routing with structured output
│       ├── context.ts       # semantic memory retrieval (no LLM)
│       ├── action.ts        # tool execution stub (Phase 3)
│       ├── response.ts      # LLM reply + send
│       └── memoryWriter.ts  # LLM fact extraction + upsert
├── webhook/
│   ├── routes.ts        # Fastify routes: verify, receive, health
│   └── parser.ts        # raw WhatsApp payload → ParsedMessage
└── utils/
    ├── dedup.ts         # Redis NX deduplication
    └── tokenTrim.ts     # keeps context window under 12k tokens
```

Providers are injected at boot via `buildGraph({ messaging, memory, checkpointer })`. To swap WhatsApp for Telegram, implement `IMessagingProvider` and change one line in `index.ts`.

---

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (Node.js 20+, ESM) |
| Web server | Fastify |
| Agent orchestration | LangGraph |
| LLM | GPT-4o (all nodes) |
| Embeddings | text-embedding-3-small |
| Database | PostgreSQL + pgvector |
| Conversation state | PostgresSaver (LangGraph checkpointer) |
| Deduplication | Redis |
| Messaging | WhatsApp Cloud API (Meta) |

---

## Running locally

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [pnpm](https://pnpm.io) — `npm install -g pnpm`
- [Docker](https://www.docker.com) — for Postgres and Redis
- An [OpenAI API key](https://platform.openai.com)

### 1. Clone and install

```bash
git clone <repo>
cd travel-companion
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```bash
OPENAI_API_KEY=sk-...        # required — used by all LLM and embedding calls
DATABASE_URL=postgresql://user:pass@localhost:5432/travel_agent  # already set
REDIS_URL=redis://localhost:6379                                  # already set
MESSAGING_PROVIDER=console   # logs replies to stdout — no WhatsApp needed locally
```

WhatsApp credentials are only needed when `MESSAGING_PROVIDER=whatsapp`.

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (with pgvector) and Redis.

### 4. Apply the database migration

```bash
docker cp migrations/001_init.sql travel-companion-db-1:/tmp/init.sql
docker exec travel-companion-db-1 psql -U user -d travel_agent -f /tmp/init.sql
```

### 5. Start the server

```bash
pnpm dev
```

Server starts on `http://localhost:3000`.

### 6. Send a test message

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "id": "test-001",
            "from": "+5511999999999",
            "type": "text",
            "text": { "body": "Hi! I am in Tokyo for 5 days. I hate crowded places and love ramen." }
          }]
        }
      }]
    }]
  }'
```

You'll see the LLM reply logged in your terminal:

```
[MSG → +5511999999999]: Welcome to Tokyo! Since you love ramen and prefer quieter spots...
```

Send a follow-up message with a different `"id"` (same `"from"`):

```bash
# Change "id" to "test-002" to avoid deduplication
"id": "test-002",
"text": { "body": "Find me a good ramen spot." }
```

The reply will reference what you said in the first message — that's the memory working.

### 7. Run tests

```bash
pnpm test
```

18 tests covering the parser, providers, and all graph nodes.

---

## Connecting real WhatsApp

1. Create a [Meta Developer App](https://developers.facebook.com) with WhatsApp product enabled
2. Get your `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and set a `WHATSAPP_VERIFY_TOKEN`
3. Update `.env`:
   ```bash
   MESSAGING_PROVIDER=whatsapp
   WHATSAPP_TOKEN=...
   WHATSAPP_PHONE_NUMBER_ID=...
   WHATSAPP_VERIFY_TOKEN=your-chosen-secret
   ```
4. Expose your local server with [ngrok](https://ngrok.com):
   ```bash
   ngrok http 3000
   ```
5. Set the ngrok URL as your webhook in the Meta dashboard: `https://your-url.ngrok.io/webhook`
6. Meta will call `GET /webhook` to verify — it'll pass automatically

---

## What's next (Phase 3)

- `searchPlaces` — Google Places API
- `getWeather` — OpenWeather API
- `getFlightStatus` — AviationStack
- `currencyConvert` — Frankfurter API
- `extractDocumentData` — GPT-4o vision for boarding passes, menus, signs
