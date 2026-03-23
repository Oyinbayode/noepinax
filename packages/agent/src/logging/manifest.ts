import type { AgentConfig, AgentIdentity } from "@noepinax/shared";

export function buildAgentJson(
  config: AgentConfig,
  walletAddress: `0x${string}`,
  operatorAddress: `0x${string}`,
  erc8004Id?: string,
): AgentIdentity {
  const capabilities =
    config.role === "artist"
      ? ["observe_market", "reason_venice", "generate_art", "mint_erc721", "create_auction", "settle_auction"]
      : ["watch_auctions", "evaluate_art", "place_bids", "reflect"];

  return {
    erc8004_id: erc8004Id ?? "",
    ens_name: `${config.name}.noepinax.eth`,
    wallet_address: walletAddress,
    operator_address: operatorAddress,
    role: config.role,
    name: config.name,
    personality: config.personality,
    capabilities,
    service_endpoints: [
      { type: "agent_log", url: `https://noepinax.vercel.app/api/logs?agent=${config.name}` },
    ],
  };
}
