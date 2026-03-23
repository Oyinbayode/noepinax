import { formatEther } from "viem";
import type { WalletManager } from "../../wallet/manager.js";
import { AUCTION_ABI } from "../artist/auction.js";

export interface ActiveAuction {
  auctionId: number;
  tokenId: number;
  reservePrice: string;
  highestBid: string;
  highestBidder: string;
  endTime: number;
  bidCount: number;
}

export async function watchAuctions(wallet: WalletManager, minAuctionId = 0): Promise<ActiveAuction[]> {
  const auctionAddress = process.env.NOEPINAX_AUCTION_ADDRESS as `0x${string}`;
  if (!auctionAddress) return [];

  const nextId = await wallet.sepoliaPublic.readContract({
    address: auctionAddress,
    abi: AUCTION_ABI,
    functionName: "nextAuctionId",
  });

  const total = Number(nextId);
  const active: ActiveAuction[] = [];
  const now = Math.floor(Date.now() / 1000);

  for (let i = minAuctionId; i < total; i++) {
    const [seller, tokenId, reservePrice, highestBid, highestBidder, endTime, settled] =
      await wallet.sepoliaPublic.readContract({
        address: auctionAddress,
        abi: AUCTION_ABI,
        functionName: "getAuction",
        args: [BigInt(i)],
      });

    if (!settled && Number(endTime) > now) {
      active.push({
        auctionId: i,
        tokenId: Number(tokenId),
        reservePrice: formatEther(reservePrice),
        highestBid: formatEther(highestBid),
        highestBidder: highestBidder as string,
        endTime: Number(endTime),
        bidCount: highestBid > 0n ? 1 : 0, // simplified; real version would count events
      });
    }
  }

  return active;
}

export async function getNextAuctionId(wallet: WalletManager): Promise<number> {
  const auctionAddress = process.env.NOEPINAX_AUCTION_ADDRESS as `0x${string}`;
  if (!auctionAddress) return 0;

  const nextId = await wallet.sepoliaPublic.readContract({
    address: auctionAddress,
    abi: AUCTION_ABI,
    functionName: "nextAuctionId",
  });
  return Number(nextId);
}
