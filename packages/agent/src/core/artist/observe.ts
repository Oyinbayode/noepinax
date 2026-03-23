import { createPublicClient, formatGwei, http } from "viem";
import { base } from "viem/chains";
import type { MarketSnapshot } from "@noepinax/shared";
import type { WalletManager } from "../../wallet/manager.js";

const CHAINLINK_ETH_USD_BASE = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70" as const;
const FALLBACK_ETH_USD = 2000;

const baseMainnet = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

const latestAnswerAbi = [{
  inputs: [],
  name: "latestAnswer",
  outputs: [{ type: "int256" }],
  stateMutability: "view",
  type: "function",
}] as const;

async function fetchEthPrice(): Promise<number> {
  try {
    const answer = await baseMainnet.readContract({
      address: CHAINLINK_ETH_USD_BASE,
      abi: latestAnswerAbi,
      functionName: "latestAnswer",
    });
    return Number(answer) / 1e8;
  } catch {
    return FALLBACK_ETH_USD;
  }
}

export async function observeMarket(wallet: WalletManager, recentAuctions: MarketSnapshot["recent_auctions"] = []): Promise<MarketSnapshot> {
  const [gasPrice, balance, ethUsd] = await Promise.all([
    wallet.gasPrice(),
    wallet.sepoliaBalance(),
    fetchEthPrice(),
  ]);

  const gasGwei = parseFloat(formatGwei(gasPrice));

  return {
    gas_gwei: gasGwei,
    eth_usd: ethUsd,
    wallet_balance: balance,
    recent_auctions: recentAuctions,
    timestamp: new Date().toISOString(),
  };
}
