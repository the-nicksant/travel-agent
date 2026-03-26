# CLAUDE.md — Travel Agent Project Guide

This file is the primary reference for any AI assistant working on this codebase. Read it fully before writing any code. It defines project scope, architecture principles, code boundaries, and conventions that must be respected throughout the implementation.

---

## Project Scope

A WhatsApp-native AI travel companion that provides **stateful, context-aware, in-trip assistance**. It remembers what the user has done, seen, liked, and disliked, and uses that memory to give personalized answers in real time.

The full technical spec lives in `SPEC.md`. This file is about *how to build it*, not *what to build*.

**In scope for this MVP:**
- Receiving and sending WhatsApp messages
- Stateful multi-turn conversation with LangGraph
- Semantic memory (pgvector) for persistent user context
- Tool calls: maps, weather, flights, currency, document OCR
- Message deduplication via Redis

**Out of scope (do not build, do not design for):**
- Multi-user dashboards or admin panels
- Pre-trip planning features
- Expense tracking or budgeting workflows
- Any web frontend
- Authentication or user registration flows

---

## Architecture Philosophy

This project follows **Clean Architecture** principles, applied pragmatically. The goal is clear abstractions and swappable infrastructure — not a rigid multi-layer framework.

### The one rule that matters most

> **The domain (agent logic, state, tools) must never import from infrastructure (WhatsApp, database, Redis).**

Dependency arrows always point inward:

```
Infrastructure (WhatsApp, Postgres, Redis)
        │
        ▼
   Interfaces (ports — contracts the infra must fulfill)
        │
        ▼
   Domain (graph, nodes, tools, state)
```

The graph nodes orchestrate the intelligence. They do not know how messages are sent, where memories are stored, or how deduplication works. They call interfaces. Infrastructure implements those interfaces.

### Three practical layers

This is not a DDD hexagonal architecture with 6 layers. It is three layers:

**1. Domain** (`src/graph/`, `src/memory/`)
The agent logic. State, nodes, tools. Has zero knowledge of WhatsApp, Postgres, or Redis. Depends only on interfaces.

**2. Infrastructure** (`src/providers/`)
Concrete implementations: WhatsApp Cloud API client, Postgres memory store, Redis dedup. Each provider implements a shared interface. Swapping a provider means replacing one file, not touching the domain.

**3. Application** (`src/index.ts`, `src/config.ts`)
Wires domain to infrastructure. Registers routes. Reads env vars. Boots the server. This layer is thin — it composes, it does not compute.

---

## Folder Structure

```
src/
├── index.ts                    # App entry: boot Fastify, register routes, wire providers
├── config.ts                   # Env vars loaded, validated, and exported — nothing else
│
├── graph/                      # DOMAIN — no infra imports allowed here
│   ├── state.ts                # TripState Annotation — the shape of all agent state
│   ├── graph.ts                # Graph assembly: nodes, edges, compile with checkpointer
│   ├── nodes/
│   │   ├── supervisor.ts       # Routes intent to next node
│   │   ├── context.ts          # Calls IMemoryStore.search() — pure retrieval, no LLM
│   │   ├── action.ts           # LLM + tool execution loop
│   │   ├── response.ts         # Final LLM call → calls IMessagingProvider.send()
│   │   └── memoryWriter.ts     # Extracts facts → calls IMemoryStore.upsert()
│   └── tools/
│       ├── index.ts            # Exports allTools[]
│       ├── maps.ts
│       ├── weather.ts
│       ├── flights.ts
│       ├── currency.ts
│       └── vision.ts
│
├── interfaces/                 # Contracts — implemented by providers, used by domain
│   ├── messaging.ts            # IMessagingProvider
│   └── memory.ts               # IMemoryStore
│
├── providers/                  # INFRASTRUCTURE — implements interfaces
│   ├── messaging/
│   │   ├── whatsapp.ts         # WhatsApp Cloud API implementation of IMessagingProvider
│   │   └── console.ts          # Console (stdout) implementation — for local dev/testing
│   └── memory/
│       └── pgvector.ts         # Postgres + pgvector implementation of IMemoryStore
│
├── webhook/                    # HTTP layer — parses incoming payloads, calls graph
│   ├── routes.ts               # Fastify routes: GET /webhook, POST /webhook, GET /health
│   └── parser.ts               # Parses raw WhatsApp payload → structured ParsedMessage
│
└── utils/
    ├── dedup.ts                 # Redis dedup — isDuplicate(messageId)
    └── tokenTrim.ts             # trimForContext(messages) — wraps LangGraph trimMessages
```

---

## The Two Interfaces

These are the only two abstractions that separate domain from infrastructure. Define them first. Everything else builds from them.

### `src/interfaces/messaging.ts`

```typescript
export interface OutboundMessage {
  to: string;
  text: string;
}

export interface TemplateMessage {
  to: string;
  templateName: string;
  params: string[];
}

export interface IMessagingProvider {
  sendText(message: OutboundMessage): Promise<void>;
  sendTemplate(message: TemplateMessage): Promise<void>;
}
```

### `src/interfaces/memory.ts`

```typescript
export interface MemoryRecord {
  content: string;
  score?: number;
}

export interface SearchParams {
  userPhone: string;
  query: string;
  topK?: number;
  minScore?: number;
}

export interface IMemoryStore {
  upsert(userPhone: string, content: string): Promise<void>;
  search(params: SearchParams): Promise<string[]>;
}
```

**Rules for these interfaces:**
- No implementation details leak into the interface (no `pg.Pool`, no `fetch`, no API keys)
- Both interfaces live in `src/interfaces/` and are imported by domain nodes
- Concrete providers in `src/providers/` implement these interfaces
- Providers are instantiated once in `src/index.ts` and injected into the graph via state or closures

---

## How Providers Are Injected

Providers are instantiated at boot time in `src/index.ts` and passed into the graph factory:

```typescript
// src/index.ts
import { createWhatsAppProvider } from "./providers/messaging/whatsapp.js";
import { createPgVectorMemoryStore } from "./providers/memory/pgvector.js";
import { buildGraph } from "./graph/graph.js";

const messaging = createWhatsAppProvider();
const memory = createPgVectorMemoryStore(pool);
const graph = buildGraph({ messaging, memory, checkpointer });
```

The graph factory closes over these dependencies:

```typescript
// src/graph/graph.ts
export function buildGraph(deps: {
  messaging: IMessagingProvider;
  memory: IMemoryStore;
  checkpointer: BaseCheckpointSaver;
}) {
  // nodes are built as closures that capture deps
  const responseNode = createResponseNode(deps.messaging);
  const contextNode = createContextNode(deps.memory);
  const memoryWriterNode = createMemoryWriterNode(deps.memory);
  // ...
}
```

This means: to swap WhatsApp for Telegram, create `src/providers/messaging/telegram.ts`, implement `IMessagingProvider`, and change one line in `src/index.ts`. Nothing in the domain changes.

---

## Code Boundaries — What Cannot Cross Layers

These are hard rules. Do not violate them, even for convenience.

| What | Can import from | Cannot import from |
|---|---|---|
| `src/graph/` (domain) | `src/interfaces/`, `src/utils/` | `src/providers/`, `src/webhook/`, `src/config.ts` directly |
| `src/interfaces/` | nothing | anything |
| `src/providers/` | `src/interfaces/`, `src/config.ts` | `src/graph/` |
| `src/webhook/` | `src/graph/`, `src/utils/`, `src/config.ts` | `src/providers/` directly |
| `src/index.ts` | everything | — |

**Specific things that must never happen:**
- A graph node importing `pg`, `ioredis`, or `fetch` directly
- A graph node importing `config.ts` to read env vars
- A provider importing from `src/graph/`
- `webhook/routes.ts` constructing a `Pool` or Redis client

---

## Naming Conventions

**Files:** `camelCase.ts` for all source files. No kebab-case, no snake_case in filenames.

**Interfaces:** Prefix with `I` — `IMessagingProvider`, `IMemoryStore`. This distinguishes contracts from implementations immediately.

**Providers:** Named by what they implement and how — `whatsapp.ts` implements `IMessagingProvider`, `pgvector.ts` implements `IMemoryStore`.

**Factory functions vs classes:** Prefer factory functions (`createWhatsAppProvider()`) over classes for providers. They are easier to compose and test.

**Node creators:** Nodes that require dependencies are factory functions prefixed with `create` — `createResponseNode(messaging)`, `createContextNode(memory)`. Nodes without deps are plain async functions — `supervisorNode`.

**Types vs interfaces:** Use `interface` for contracts (`IMemoryStore`), `type` for data shapes (`TripState`, `ParsedMessage`, `OutboundMessage`).

**SQL columns:** `snake_case` in all SQL files and raw queries. TypeScript maps these to `camelCase` at the boundary in providers.

---

## File Size and Responsibility Rules

Each file has one reason to exist. If you find yourself writing more than ~120 lines in a node or provider, it is doing too much — split it.

- **Node files** (`supervisor.ts`, `context.ts`, etc.): one node per file. The node function + its prompt constant + its output type. Nothing else.
- **Tool files** (`maps.ts`, `weather.ts`, etc.): one tool per file. The `tool()` definition + the API call it wraps. No shared state between tools.
- **Provider files** (`whatsapp.ts`, `pgvector.ts`): the factory function + the interface implementation. No business logic.
- **`graph.ts`**: only graph assembly — `addNode`, `addEdge`, `addConditionalEdges`, `compile`. Zero business logic.
- **`state.ts`**: only the `Annotation.Root()` definition and the exported `TripState` type. Nothing else.
- **`config.ts`**: only env var loading and validation. Exports typed constants and the `pg.Pool`. No logic.

---

## The Console Messaging Provider

Always maintain `src/providers/messaging/console.ts` — a messaging provider that logs to stdout instead of calling WhatsApp. This is used during local development so you can test the full graph without a live WhatsApp number.

```typescript
// src/providers/messaging/console.ts
import type { IMessagingProvider, OutboundMessage, TemplateMessage } from "../../interfaces/messaging.js";

export function createConsoleProvider(): IMessagingProvider {
  return {
    async sendText({ to, text }) {
      console.log(`[MSG → ${to}]: ${text}`);
    },
    async sendTemplate({ to, templateName, params }) {
      console.log(`[TEMPLATE → ${to}]: ${templateName} ${JSON.stringify(params)}`);
    },
  };
}
```

Switch between providers via an env var in `index.ts`:

```typescript
const messaging = process.env.MESSAGING_PROVIDER === "console"
  ? createConsoleProvider()
  : createWhatsAppProvider();
```

---

## Error Handling Principles

**Never let graph node errors surface to the WhatsApp webhook.** The webhook must always return 200. Errors inside `processIncoming` are caught and logged — never thrown upward.

**Nodes fail gracefully.** If `contextNode` fails to reach the DB, it returns `{ retrievedMemories: [], next: "supervisor" }` and logs the error. The conversation continues without memory rather than crashing.

**Tools fail gracefully.** Every tool should have a try/catch that returns a human-readable error string rather than throwing. The LLM can then tell the user "I couldn't retrieve that right now" instead of the graph exploding.

**Providers validate at boot.** If `OPENAI_API_KEY` is missing, the app crashes at startup with a clear message — not mid-request. This is enforced in `config.ts`.

Pattern for tool error handling:
```typescript
try {
  // API call
} catch (err) {
  console.error("[tool:search_places]", err);
  return "Could not retrieve places right now. Please try again.";
}
```

---

## What to Build First

Follow the phases in `SPEC.md` strictly. Do not start Phase 2 before Phase 1 is working end-to-end.

The Phase 1 milestone is an **echo bot**: a message sent to WhatsApp returns the same text back. This validates the full pipe — Meta webhook verification, Fastify routing, dedup, and WhatsApp send — before any agent logic exists.

Only when the echo bot works do you introduce LangGraph.

---

## Things That Will Tempt You — Don't Do Them

- **Do not add a repository pattern on top of providers.** Two abstraction layers for database access is overengineering for this scope. The `IMemoryStore` interface is the repository.
- **Do not add a service layer between the graph and the webhook.** The webhook calls the graph directly. There is no `AgentService` in between.
- **Do not add dependency injection containers** (tsyringe, inversify, etc.). Manual constructor injection via factory functions is sufficient and much easier to follow.
- **Do not split tools into separate npm packages.** One package, one repo, for the MVP.
- **Do not add an ORM.** Prisma cannot express `<=>` cosine similarity natively. Use raw `pg` queries for the memory store.
- **Do not generalize prematurely.** If only one messaging provider exists, there is no need to make `buildGraph` accept an array of providers. Build for what exists, not what might exist.