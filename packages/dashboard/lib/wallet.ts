"use client";

import { useState, useCallback } from "react";

const BASE_SEPOLIA_CHAIN_ID = "0x14a34"; // 84532
const MARKETPLACE_ABI = [
  "function buyItem(uint256 listingId) external payable",
  "function getListing(uint256 listingId) external view returns (address seller, address nftContract, uint256 tokenId, uint256 price, bool active)",
];

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("Please install MetaMask to buy NFTs");
      return;
    }

    setConnecting(true);
    try {
      const { BrowserProvider } = await import("ethers");
      const provider = new BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      // switch to Base Sepolia
      try {
        await provider.send("wallet_switchEthereumChain", [{ chainId: BASE_SEPOLIA_CHAIN_ID }]);
      } catch (switchErr: any) {
        if (switchErr.code === 4902) {
          await provider.send("wallet_addEthereumChain", [{
            chainId: BASE_SEPOLIA_CHAIN_ID,
            chainName: "Base Sepolia",
            rpcUrls: ["https://sepolia.base.org"],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            blockExplorerUrls: ["https://sepolia.basescan.org"],
          }]);
        }
      }

      setAddress(accounts[0]);
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  const buyNFT = useCallback(async (
    marketplaceAddress: string,
    listingId: number,
    priceEth: string,
  ): Promise<string | null> => {
    if (!address) return null;

    const { BrowserProvider, Contract, parseEther } = await import("ethers");
    const provider = new BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();

    const marketplace = new Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
    const tx = await marketplace.buyItem(listingId, { value: parseEther(priceEth) });
    const receipt = await tx.wait();
    return receipt.hash;
  }, [address]);

  return { address, connecting, connect, disconnect, buyNFT };
}
