import type { ArtworkMetadata, ToolCall } from "@noepinax/shared";
import type { WalletManager } from "../../wallet/manager.js";
import { pinArtwork } from "../../art/pin.js";

const NOEPINAX_ART_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "uri", type: "string" },
    ],
    name: "mint",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function mintArtwork(
  wallet: WalletManager,
  png: Buffer,
  metadata: ArtworkMetadata,
): Promise<{ tokenId: number; txHash: string; ipfsUri: string; imageUri: string; gasUsed: bigint; toolCall: ToolCall }> {
  const artAddress = process.env.NOEPINAX_ART_ADDRESS as `0x${string}`;
  if (!artAddress) throw new Error("NOEPINAX_ART_ADDRESS not set");

  const start = Date.now();

  const { imageUri, metadataUri } = await pinArtwork(png, metadata);

  const txHash = await wallet.sepoliaWallet.writeContract({
    address: artAddress,
    abi: NOEPINAX_ART_ABI,
    functionName: "mint",
    args: [wallet.address, metadataUri],
  });

  const receipt = await wallet.sepoliaPublic.waitForTransactionReceipt({ hash: txHash });
  const gasUsed = receipt.gasUsed * (receipt.effectiveGasPrice ?? 0n);

  wallet.guardrails.recordGasUsed(gasUsed);

  const totalSupply = await wallet.sepoliaPublic.readContract({
    address: artAddress,
    abi: NOEPINAX_ART_ABI,
    functionName: "totalSupply",
  });
  const tokenId = Number(totalSupply) - 1;

  const toolCall: ToolCall = {
    tool: "noepinax_art",
    action: "mint",
    input: { metadata_uri: metadataUri, image_uri: imageUri },
    output: { token_id: tokenId, tx_hash: txHash },
    duration_ms: Date.now() - start,
    tx_hash: txHash,
    gas_used: Number(gasUsed),
  };

  return { tokenId, txHash, ipfsUri: metadataUri, imageUri, gasUsed, toolCall };
}
