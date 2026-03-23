import type { AgentLogger } from "../../logging/agent-log.js";
import type { ToolCall, SafetyCheck } from "@noepinax/shared";
import type { VeniceClient } from "../../venice/client.js";

interface ReflectionInput {
  cycleId: string;
  auctionId: number;
  didBid: boolean;
  txHash: string | null;
  toolCalls: ToolCall[];
  safetyChecks: SafetyCheck[];
  venice: VeniceClient;
}

export function reflect(logger: AgentLogger, input: ReflectionInput): void {
  const outcome = input.didBid
    ? { auction_id: input.auctionId, action: "bid_placed", tx_hash: input.txHash }
    : { auction_id: input.auctionId, action: "passed" };

  logger.logPhase(
    input.cycleId,
    "reflect",
    { auction_id: input.auctionId },
    { did_bid: input.didBid },
    input.toolCalls,
    input.safetyChecks,
    outcome,
    input.venice.totalTokens,
    "0",
  );

  logger.flush();
}
