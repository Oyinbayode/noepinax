import type { CollectorConfig, ArtworkMetadata, CreativeDecision, ToolCall } from "@noepinax/shared";
import type { VeniceClient, CollectorBidDecision } from "../../venice/client.js";
import type { ActiveAuction } from "./watch.js";
import { passesPreferenceFilter } from "./filters.js";

import { TEMPERANCE_SYSTEM_PROMPT } from "../../venice/prompts/temperance.js";
import { FERVOR_SYSTEM_PROMPT } from "../../venice/prompts/fervor.js";
import { DUSK_SYSTEM_PROMPT } from "../../venice/prompts/dusk.js";
import { CONTRARIAN_SYSTEM_PROMPT } from "../../venice/prompts/contrarian.js";
import { ECHO_SYSTEM_PROMPT } from "../../venice/prompts/echo.js";

const PROMPTS: Record<string, string> = {
  temperance: TEMPERANCE_SYSTEM_PROMPT,
  fervor: FERVOR_SYSTEM_PROMPT,
  dusk: DUSK_SYSTEM_PROMPT,
  contrarian: CONTRARIAN_SYSTEM_PROMPT,
  echo: ECHO_SYSTEM_PROMPT,
};

export async function evaluateArtwork(
  venice: VeniceClient,
  config: CollectorConfig,
  artwork: ArtworkMetadata,
  decision: CreativeDecision,
  auction: ActiveAuction,
  recentDecisions: CreativeDecision[],
): Promise<{ bidDecision: CollectorBidDecision; toolCall: ToolCall } | null> {
  // cheap filter first - skip Venice call if artwork doesn't match taste
  if (!passesPreferenceFilter(config, decision, auction, recentDecisions)) {
    return null;
  }

  const prompt = PROMPTS[config.name];
  if (!prompt) return null;

  const start = Date.now();

  const bidDecision = await venice.evaluate(
    artwork,
    {
      reserve_price: auction.reservePrice,
      current_bid: auction.highestBid,
      bid_count: auction.bidCount,
    },
    prompt,
  );

  const toolCall: ToolCall = {
    tool: "venice_api",
    action: "evaluate",
    input: { artwork: artwork.name, auction_id: auction.auctionId },
    output: bidDecision as unknown as Record<string, unknown>,
    duration_ms: Date.now() - start,
  };

  return { bidDecision, toolCall };
}
