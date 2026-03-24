import { parseEther } from "viem";
import type { ToolCall } from "@noepinax/shared";
import type { WalletManager } from "../../wallet/manager.js";
import { AUCTION_DURATION_SECONDS } from "@noepinax/shared";

const AUCTION_ABI = [
  {
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "reservePrice", type: "uint256" },
      { name: "duration", type: "uint256" },
    ],
    name: "createAuction",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "auctionId", type: "uint256" }],
    name: "settleAuction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "auctionId", type: "uint256" }],
    name: "getAuction",
    outputs: [
      { name: "seller", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "reservePrice", type: "uint256" },
      { name: "highestBid", type: "uint256" },
      { name: "highestBidder", type: "address" },
      { name: "endTime", type: "uint256" },
      { name: "settled", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextAuctionId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "auctionId", type: "uint256" }],
    name: "bid",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export async function createAuction(
  wallet: WalletManager,
  tokenId: number,
  reservePriceEth: string,
): Promise<{ auctionId: number; txHash: string; toolCall: ToolCall }> {
  const artAddress = process.env.NOEPINAX_ART_ADDRESS as `0x${string}`;
  const auctionAddress = process.env.NOEPINAX_AUCTION_ADDRESS as `0x${string}`;
  if (!artAddress || !auctionAddress) throw new Error("Contract addresses not set");

  const start = Date.now();

  // approval handled once at init via setApprovalForAll
  const reserveWei = parseEther(reservePriceEth);
  const createTx = await wallet.sepoliaWallet.writeContract({
    address: auctionAddress,
    abi: AUCTION_ABI,
    functionName: "createAuction",
    args: [artAddress, BigInt(tokenId), reserveWei, BigInt(AUCTION_DURATION_SECONDS)],
  });
  const receipt = await wallet.sepoliaPublic.waitForTransactionReceipt({ hash: createTx });
  const gasUsed = receipt.gasUsed * (receipt.effectiveGasPrice ?? 0n);
  wallet.guardrails.recordGasUsed(gasUsed);

  const nextId = await wallet.sepoliaPublic.readContract({
    address: auctionAddress,
    abi: AUCTION_ABI,
    functionName: "nextAuctionId",
  });
  const auctionId = Number(nextId) - 1;

  const toolCall: ToolCall = {
    tool: "noepinax_auction",
    action: "create",
    input: { token_id: tokenId, reserve_price: reservePriceEth },
    output: { auction_id: auctionId, tx_hash: createTx },
    duration_ms: Date.now() - start,
    tx_hash: createTx,
    gas_used: Number(gasUsed),
  };

  return { auctionId, txHash: createTx, toolCall };
}

export async function settleAuction(
  wallet: WalletManager,
  auctionId: number,
): Promise<{ txHash: string; toolCall: ToolCall }> {
  const auctionAddress = process.env.NOEPINAX_AUCTION_ADDRESS as `0x${string}`;
  if (!auctionAddress) throw new Error("NOEPINAX_AUCTION_ADDRESS not set");

  const start = Date.now();

  const txHash = await wallet.sepoliaWallet.writeContract({
    address: auctionAddress,
    abi: AUCTION_ABI,
    functionName: "settleAuction",
    args: [BigInt(auctionId)],
  });

  const receipt = await wallet.sepoliaPublic.waitForTransactionReceipt({ hash: txHash });
  const gasUsed = receipt.gasUsed * (receipt.effectiveGasPrice ?? 0n);
  wallet.guardrails.recordGasUsed(gasUsed);

  const toolCall: ToolCall = {
    tool: "noepinax_auction",
    action: "settle",
    input: { auction_id: auctionId },
    output: { tx_hash: txHash },
    duration_ms: Date.now() - start,
    tx_hash: txHash,
    gas_used: Number(gasUsed),
  };

  return { txHash, toolCall };
}

export { AUCTION_ABI };
