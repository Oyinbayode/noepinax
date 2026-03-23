import type { MarketSnapshot, CreativeDecision, ToolCall } from "@noepinax/shared";
import type { VeniceClient } from "../../venice/client.js";

export async function reasonCreativeDecision(
  venice: VeniceClient,
  snapshot: MarketSnapshot,
  systemPrompt: string,
): Promise<{ decision: CreativeDecision; toolCall: ToolCall }> {
  const start = Date.now();

  const decision = await venice.reason(snapshot, systemPrompt);

  const toolCall: ToolCall = {
    tool: "venice_api",
    action: "reason",
    input: { market_snapshot: snapshot },
    output: decision as unknown as Record<string, unknown>,
    duration_ms: Date.now() - start,
  };

  return { decision, toolCall };
}
