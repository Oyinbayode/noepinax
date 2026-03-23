import { parseEther, formatEther } from "viem";
import type { WalletManager } from "../../wallet/manager.js";

const ERC721_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "index", type: "uint256" }],
    name: "tokenOfOwnerByIndex",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const MARKETPLACE_ABI = [
  {
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
    ],
    name: "listItem",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "nextListingId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    name: "tokenListing",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "listingId", type: "uint256" }],
    name: "getListing",
    outputs: [
      { name: "seller", type: "address" },
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const MARKUP: Record<string, number> = {
  temperance: 1.5,
  fervor: 2.5,
  dusk: 2.0,
  contrarian: 3.0,
  echo: 1.8,
};

export async function listOwnedTokens(
  wallet: WalletManager,
  collectorName: string,
  minTokenId = 0,
): Promise<Array<{ tokenId: number; listingId: number; price: string; txHash: string }>> {
  const artAddress = process.env.NOEPINAX_ART_ADDRESS as `0x${string}`;
  const marketplaceAddress = process.env.NOEPINAX_MARKETPLACE_ADDRESS as `0x${string}`;
  if (!artAddress || !marketplaceAddress) return [];

  const balance = await wallet.sepoliaPublic.readContract({
    address: artAddress,
    abi: ERC721_ABI,
    functionName: "balanceOf",
    args: [wallet.address],
  });

  if (Number(balance) === 0) return [];

  // ensure marketplace is approved for all tokens
  const approved = await wallet.sepoliaPublic.readContract({
    address: artAddress,
    abi: ERC721_ABI,
    functionName: "isApprovedForAll",
    args: [wallet.address, marketplaceAddress],
  });

  if (!approved) {
    const approveTx = await wallet.sepoliaWallet.writeContract({
      address: artAddress,
      abi: ERC721_ABI,
      functionName: "setApprovalForAll",
      args: [marketplaceAddress, true],
    });
    await wallet.sepoliaPublic.waitForTransactionReceipt({ hash: approveTx });
  }

  // NoepinaxArt doesn't have tokenOfOwnerByIndex (no ERC721Enumerable)
  // Instead, scan recent tokens to find ones we own
  const totalSupply = await wallet.sepoliaPublic.readContract({
    address: artAddress,
    abi: [{ inputs: [], name: "totalSupply", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }] as const,
    functionName: "totalSupply",
  });

  const listed: Array<{ tokenId: number; listingId: number; price: string; txHash: string }> = [];
  const markup = MARKUP[collectorName] ?? 2.0;
  const total = Number(totalSupply);

  // only scan tokens from the current run
  const startFrom = Math.max(minTokenId, total - 20);

  for (let i = startFrom; i < total; i++) {
    try {
      const owner = await wallet.sepoliaPublic.readContract({
        address: artAddress,
        abi: [{ inputs: [{ name: "tokenId", type: "uint256" }], name: "ownerOf", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" }] as const,
        functionName: "ownerOf",
        args: [BigInt(i)],
      });

      if (owner.toLowerCase() !== wallet.address.toLowerCase()) continue;

      // check if already listed
      const existingListing = await wallet.sepoliaPublic.readContract({
        address: marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: "tokenListing",
        args: [artAddress, BigInt(i)],
      });

      if (Number(existingListing) > 0) {
        const [, , , , active] = await wallet.sepoliaPublic.readContract({
          address: marketplaceAddress,
          abi: MARKETPLACE_ABI,
          functionName: "getListing",
          args: [existingListing],
        });
        if (active) continue;
      }

      // list at markup over the 0.005 ETH auction price
      const listPrice = parseEther((0.005 * markup).toFixed(4));

      const txHash = await wallet.sepoliaWallet.writeContract({
        address: marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: "listItem",
        args: [artAddress, BigInt(i), listPrice],
      });
      await wallet.sepoliaPublic.waitForTransactionReceipt({ hash: txHash });

      const nextId = await wallet.sepoliaPublic.readContract({
        address: marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: "nextListingId",
      });
      const listingId = Number(nextId) - 1;

      listed.push({
        tokenId: i,
        listingId,
        price: formatEther(listPrice),
        txHash,
      });
    } catch {
      continue;
    }
  }

  return listed;
}
