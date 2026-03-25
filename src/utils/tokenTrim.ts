import { trimMessages } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

export async function trimForContext(messages: BaseMessage[]): Promise<BaseMessage[]> {
  return trimMessages(messages, {
    maxTokens: 12000,
    strategy: "last",
    tokenCounter: (msgs) => msgs.reduce((acc, m) => acc + String(m.content).length / 4, 0),
    includeSystem: true,
    allowPartial: false,
  });
}
