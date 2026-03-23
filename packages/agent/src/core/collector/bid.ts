import { parseEther } from "viem";
import type { ToolCall, SafetyCheck, CollectorConfig } from "@noepinax/shared";
import type { CollectorBidDecision } from "../../venice/client.js";
import type { WalletManager } from "../../wallet/manager.js";
import type { ActiveAuction } from "./watch.js";

const BID_ABI = [
  {
    inputs: [{ name: "auctionId", type: "uint256" }],
    name: "bid",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export async function placeBid(
  wallet: WalletManager,
  config: CollectorConfig,
  auction: ActiveAuction,
  bidDecision: CollectorBidDecision,
): Promise<{ txHash: string | null; toolCall: ToolCall; safetyCheck: SafetyCheck }> {
  const auctionAddress = process.env.NOEPINAX_AUCTION_ADDRESS as `0x${string}`;
  if (!auctionAddress) throw new Error("NOEPINAX_AUCTION_ADDRESS not set");

  const start = Date.now();

  const balance = await wallet.sepoliaPublic.getBalance({ address: wallet.address });
  const gasReserve = parseEther("0.002");

  // never spend more than 30% of balance on a single bid (save for future auctions)
  const spendableBalance = balance > gasReserve ? balance - gasReserve : 0n;
  const maxPerAuction = spendableBalance * 20n / 100n;

  const maxBidWei = parseEther(config.max_bid);
  let bidAmount = parseEther(bidDecision.max_amount);

  // cap to config max, then to what we can afford
  if (bidAmount > maxBidWei) bidAmount = maxBidWei;
  if (bidAmount > maxPerAuction) bidAmount = maxPerAuction;

  // must beat current bid
  const currentBidWei = parseEther(auction.highestBid || "0");
  const minRequired = currentBidWei > 0n
    ? currentBidWei + currentBidWei / 20n
    : parseEther(auction.reservePrice);

  if (bidAmount < minRequired) bidAmount = minRequired;

  // can't afford the minimum required bid
  if (bidAmount > maxBidWei || bidAmount > maxPerAuction) {
    return {
      txHash: null,
      toolCall: {
        tool: "noepinax_auction",
        action: "bid_skipped",
        input: { auction_id: auction.auctionId, reason: "exceeds budget" },
        output: {},
        duration_ms: Date.now() - start,
      },
      safetyCheck: { check: "max_bid", passed: false, details: "Required bid exceeds budget" },
    };
  }

  const safetyCheck = wallet.guardrails.canProceed(bidAmount, balance);

  if (!safetyCheck.passed) {
    return {
      txHash: null,
      toolCall: {
        tool: "noepinax_auction",
        action: "bid_blocked",
        input: { auction_id: auction.auctionId },
        output: { reason: safetyCheck.details },
        duration_ms: Date.now() - start,
      },
      safetyCheck,
    };
  }

  const txHash = await wallet.sepoliaWallet.writeContract({
    address: auctionAddress,
    abi: BID_ABI,
    functionName: "bid",
    args: [BigInt(auction.auctionId)],
    value: bidAmount,
  });

  const receipt = await wallet.sepoliaPublic.waitForTransactionReceipt({ hash: txHash });
  const gasUsed = receipt.gasUsed * (receipt.effectiveGasPrice ?? 0n);
  wallet.guardrails.recordGasUsed(gasUsed);

  return {
    txHash,
    toolCall: {
      tool: "noepinax_auction",
      action: "bid",
      input: { auction_id: auction.auctionId, amount: bidDecision.max_amount },
      output: { tx_hash: txHash },
      duration_ms: Date.now() - start,
      tx_hash: txHash,
      gas_used: Number(gasUsed),
    },
    safetyCheck: { check: "gas_budget", passed: true, remaining: safetyCheck.remaining },
  };
}
