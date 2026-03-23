import type { AgentConfig, ArtistConfig, CollectorConfig, AuctionResult, CreativeDecision, ArtworkMetadata } from "@noepinax/shared";
import { AUCTION_DURATION_SECONDS } from "@noepinax/shared";
import { WalletManager } from "../wallet/manager.js";
import { VeniceClient } from "../venice/client.js";
import { AgentLogger } from "../logging/agent-log.js";
import { observeMarket } from "./artist/observe.js";
import { reasonCreativeDecision } from "./artist/reason.js";
import { generateArtwork } from "../art/engine.js";
import { svgToPng } from "../art/export.js";
import { mintArtwork } from "./artist/mint.js";
import { createAuction, settleAuction } from "./artist/auction.js";
import { watchAuctions, getNextAuctionId, type ActiveAuction } from "./collector/watch.js";
import { evaluateArtwork } from "./collector/evaluate.js";
import { placeBid } from "./collector/bid.js";
import { reflect } from "./collector/reflect.js";
import { listOwnedTokens } from "./collector/marketplace.js";
import { ARTIST_SYSTEM_PROMPT } from "../venice/prompts/artist.js";

export class AgentLoop {
  private config: AgentConfig;
  private wallet: WalletManager;
  private venice: VeniceClient;
  private logger: AgentLogger;
  private sequenceNumber = 0;
  private minAuctionId = 0;
  private bootTokenId = 0;
  private recentAuctions: AuctionResult[] = [];
  private recentDecisions: CreativeDecision[] = [];
  private pendingAuctions: Array<{ auctionId: number; endTime: number }> = [];
  private chattedAuctions: Set<string> = new Set();
  private running = false;

  constructor(
    config: AgentConfig,
    wallet: WalletManager,
    venice: VeniceClient,
    logger: AgentLogger,
  ) {
    this.config = config;
    this.wallet = wallet;
    this.venice = venice;
    this.logger = logger;
  }

  async init(): Promise<void> {
    // snapshot current on-chain state so we don't process stale data from previous runs
    this.minAuctionId = await getNextAuctionId(this.wallet);
    this.logger.console.info({ minAuctionId: this.minAuctionId }, "Boot auction baseline");

    if (process.env.NOEPINAX_ART_ADDRESS) {
      const artAddress = process.env.NOEPINAX_ART_ADDRESS as `0x${string}`;
      const supply = await this.wallet.sepoliaPublic.readContract({
        address: artAddress,
        abi: [{ inputs: [], name: "totalSupply", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }] as const,
        functionName: "totalSupply",
      });
      this.bootTokenId = Number(supply);
      if (this.config.role === "artist") {
        this.sequenceNumber = this.bootTokenId;
        this.logger.console.info({ sequenceNumber: this.sequenceNumber }, "Resumed sequence from chain");
      }
    }
  }

  async start(): Promise<void> {
    this.running = true;
    await this.init();
    this.logger.console.info(`Starting ${this.config.name} (${this.config.role}) loop`);

    while (this.running) {
      try {
        if (this.config.role === "artist") {
          await this.artistCycle(this.config);
        } else {
          await this.collectorCycle(this.config as CollectorConfig);
        }
      } catch (err) {
        this.logger.console.error({ err }, `Cycle error`);
        const cycleId = this.logger.startCycle();
        this.logger.logPhase(cycleId, this.config.role === "artist" ? "observe" : "watch", {}, {}, [], [],
          { error: err instanceof Error ? err.message : String(err) }, 0, "0");
        this.logger.flush();
      }

      await sleep(this.config.cycle_interval_ms);
    }
  }

  stop(): void {
    this.running = false;
    this.logger.console.info(`Stopping ${this.config.name}`);
  }

  private async pushToApi(path: string, data: unknown): Promise<any> {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    try {
      const res = await fetch(`${apiUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }

  private async fetchArtworkFromApi(tokenId: number): Promise<any | null> {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    try {
      const res = await fetch(`${apiUrl}/api/artworks/token/${tokenId}`);
      if (!res.ok) return null;
      const data = await res.json() as Record<string, any>;
      if (data.metadata && typeof data.metadata === "string") data.metadata = JSON.parse(data.metadata);
      if (data.decision && typeof data.decision === "string") data.decision = JSON.parse(data.decision);
      return data;
    } catch {
      return null;
    }
  }

  private describeFilterRejection(config: CollectorConfig, decision: CreativeDecision, auction: ActiveAuction, artworkName: string): string {
    switch (config.bidding_style) {
      case "selective":
        return `"${artworkName}" carries a ${decision.mood} mood. Not what I'm drawn to right now.`;
      case "aggressive":
        return `"${artworkName}" feels too restrained for my taste - warmth at ${decision.palette_warmth.toFixed(2)}, complexity at ${decision.complexity.toFixed(2)}.`;
      case "passive":
        return `"${artworkName}" is too intense for me - I prefer subtler work.`;
      case "contrarian":
        return `"${artworkName}" already has bidders. I only go for overlooked pieces.`;
      case "novelty":
        return `"${artworkName}" doesn't diverge enough from the artist's recent output to catch my eye.`;
      default:
        return `"${artworkName}" doesn't match what I'm looking for.`;
    }
  }

  private async chat(agentName: string, role: string, message: string, context?: Record<string, unknown>): Promise<void> {
    await this.pushToApi("/internal/chat", { agent_name: agentName, agent_role: role, message, context });
  }

  private async artistCycle(_config: ArtistConfig): Promise<void> {
    const cycleId = this.logger.startCycle();
    this.logger.console.info({ cycleId }, "Artist cycle starting");

    // settle any expired auctions first
    const settled = await this.settleExpiredAuctions(cycleId);

    // if there's still an active auction, wait for it to finish
    if (this.pendingAuctions.length > 0) {
      const next = this.pendingAuctions[0];
      const remaining = next.endTime - Math.floor(Date.now() / 1000);
      this.logger.console.info({ auctionId: next.auctionId, remaining }, "Waiting for auction to end");
      this.logger.flush();
      return;
    }

    // handle settled auctions: chat about results, re-auction unsold pieces
    for (const s of settled) {
      if (s.sold) {
        await this.chat("noepinax", "artist", `"${s.winner}" claimed my piece for ${s.finalPrice} ETH. The economy speaks.`);
      } else if (s.tokenId != null && process.env.NOEPINAX_AUCTION_ADDRESS) {
        await this.chat("noepinax", "artist", `No one bid on auction #${s.auctionId}. Putting it back up - the right collector will come.`);
        try {
          const reauction = await createAuction(this.wallet, s.tokenId, "0.005");
          const now = Math.floor(Date.now() / 1000);
          this.pendingAuctions.push({ auctionId: reauction.auctionId, endTime: now + AUCTION_DURATION_SECONDS });
          this.logger.console.info({ auctionId: reauction.auctionId, tokenId: s.tokenId }, "Re-auctioned unsold piece");

          const apiArtwork = await this.fetchArtworkFromApi(s.tokenId);
          await this.pushToApi("/internal/auction", {
            id: reauction.auctionId,
            artwork_id: apiArtwork?.id ?? null,
            token_id: s.tokenId,
            reserve_price: "0.005",
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + AUCTION_DURATION_SECONDS * 1000).toISOString(),
            tx_hash: reauction.txHash,
          });
        } catch (err) {
          this.logger.console.error({ tokenId: s.tokenId, err }, "Re-auction failed");
        }
        this.logger.flush();
        return;
      }
    }

    // observe
    const snapshot = await observeMarket(this.wallet, this.recentAuctions);
    this.logger.logPhase(cycleId, "observe", { market_snapshot: snapshot }, {}, [], [], {}, 0, "0");

    // reason
    const { decision, toolCall } = await reasonCreativeDecision(this.venice, snapshot, ARTIST_SYSTEM_PROMPT);
    this.logger.logPhase(cycleId, "reason", { market_snapshot: snapshot }, { creative_decision: decision },
      [toolCall], [], {}, this.venice.totalTokens, "0");
    this.logger.console.info({ warmth: decision.palette_warmth, complexity: decision.complexity, mood: decision.mood }, "Decision");

    // clamp reserve price to testnet budget
    const MAX_RESERVE = 0.02;
    const reserveNum = parseFloat(decision.reserve_price);
    if (isNaN(reserveNum) || reserveNum > MAX_RESERVE) {
      decision.reserve_price = MAX_RESERVE.toString();
    } else if (reserveNum < 0.001) {
      decision.reserve_price = "0.001";
    }

    // track for Echo's divergence calculation
    this.recentDecisions.push(decision);
    if (this.recentDecisions.length > 3) this.recentDecisions.shift();

    // create
    this.sequenceNumber++;
    const artwork = generateArtwork(decision, snapshot, this.sequenceNumber);
    const png = await svgToPng(artwork.svg);
    this.logger.logPhase(cycleId, "create", {}, { creative_decision: decision }, [], [],
      { title: artwork.title, size_bytes: png.length }, this.venice.totalTokens, "0");
    this.logger.console.info({ title: artwork.title }, "Created");
    await this.chat("noepinax", "artist", `I've created "${artwork.title}". ${decision.reasoning}`);

    // mint (requires deployed contracts)
    if (!process.env.NOEPINAX_ART_ADDRESS) {
      this.logger.console.warn("NOEPINAX_ART_ADDRESS not set, skipping mint");
      this.logger.flush();
      return;
    }

    const balance = await this.wallet.sepoliaPublic.getBalance({ address: this.wallet.address });
    const safetyCheck = this.wallet.guardrails.canProceed(100000n, balance);
    if (!safetyCheck.passed) {
      this.logger.console.warn({ reason: safetyCheck.details }, "Mint blocked by guardrails");
      this.logger.flush();
      return;
    }

    const metadata = {
      name: artwork.title,
      description: `Generative artwork by Noepinax. Gas: ${Math.round(snapshot.gas_gwei)}gwei, ETH: $${Math.round(snapshot.eth_usd)}. Mood: ${decision.mood}.`,
      image: "",
      attributes: [
        { trait_type: "palette_warmth", value: decision.palette_warmth },
        { trait_type: "complexity", value: decision.complexity },
        { trait_type: "density", value: decision.density },
        { trait_type: "mood", value: decision.mood },
        { trait_type: "gas_gwei", value: Math.round(snapshot.gas_gwei) },
        { trait_type: "sequence", value: this.sequenceNumber },
      ],
      creator: "noepinax.eth",
    };

    const mintResult = await mintArtwork(this.wallet, png, metadata);
    this.logger.logPhase(cycleId, "mint", {}, {}, [mintResult.toolCall], [safetyCheck],
      { token_id: mintResult.tokenId, tx_hash: mintResult.txHash, ipfs_uri: mintResult.ipfsUri },
      this.venice.totalTokens, mintResult.gasUsed.toString());
    this.logger.console.info({ tokenId: mintResult.tokenId, tx: mintResult.txHash }, "Minted");

    // push artwork to API
    const artworkPayload = {
      token_id: mintResult.tokenId,
      title: artwork.title,
      ipfs_uri: mintResult.ipfsUri,
      image_url: mintResult.imageUri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/"),
      metadata,
      snapshot,
      decision,
    };
    const artworkRes = await this.pushToApi("/internal/artwork", artworkPayload);

    // create auction
    if (process.env.NOEPINAX_AUCTION_ADDRESS) {
      const auctionResult = await createAuction(this.wallet, mintResult.tokenId, decision.reserve_price);
      const now = Math.floor(Date.now() / 1000);
      this.pendingAuctions.push({
        auctionId: auctionResult.auctionId,
        endTime: now + AUCTION_DURATION_SECONDS,
      });
      this.logger.console.info({ auctionId: auctionResult.auctionId }, "Auction created");
      await this.chat("noepinax", "artist", `"${artwork.title}" is now up for auction. Reserve price: ${decision.reserve_price} ETH. Let's see who resonates with this one.`);

      await this.pushToApi("/internal/auction", {
        id: auctionResult.auctionId,
        artwork_id: artworkRes?.artwork_id ?? null,
        token_id: mintResult.tokenId,
        reserve_price: decision.reserve_price,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + AUCTION_DURATION_SECONDS * 1000).toISOString(),
        tx_hash: auctionResult.txHash,
      });
    }

    this.logger.flush();
  }

  private async settleExpiredAuctions(cycleId: string): Promise<Array<{ auctionId: number; sold: boolean; winner?: string; finalPrice?: string; tokenId?: number }>> {
    if (!process.env.NOEPINAX_AUCTION_ADDRESS) return [];

    const now = Math.floor(Date.now() / 1000);
    const expired = this.pendingAuctions.filter((a) => a.endTime <= now);
    this.pendingAuctions = this.pendingAuctions.filter((a) => a.endTime > now);
    const settled: Array<{ auctionId: number; sold: boolean; winner?: string; finalPrice?: string; tokenId?: number }> = [];

    for (const auction of expired) {
      try {
        const result = await settleAuction(this.wallet, auction.auctionId);
        this.logger.logPhase(cycleId, "settle", {}, {}, [result.toolCall], [],
          { auction_id: auction.auctionId }, this.venice.totalTokens, "0");
        this.logger.console.info({ auctionId: auction.auctionId }, "Auction settled");

        const settleRes = await this.pushToApi("/internal/settle", { auction_id: auction.auctionId, tx_hash: result.txHash });
        const sold = settleRes?.sold ?? false;
        settled.push({
          auctionId: auction.auctionId,
          sold,
          winner: settleRes?.winner,
          finalPrice: settleRes?.final_price,
          tokenId: settleRes?.token_id,
        });
      } catch (err) {
        this.logger.console.error({ auctionId: auction.auctionId, err }, "Settle failed");
      }
    }

    return settled;
  }

  private async collectorCycle(config: CollectorConfig): Promise<void> {
    const cycleId = this.logger.startCycle();

    const activeAuctions = await watchAuctions(this.wallet, this.minAuctionId);
    this.logger.logPhase(cycleId, "watch", { active_auctions: activeAuctions.length }, {}, [], [], {}, 0, "0");

    if (activeAuctions.length === 0) {
      this.logger.flush();
      return;
    }

    for (const auction of activeAuctions) {
      if (auction.highestBidder.toLowerCase() === this.wallet.address.toLowerCase()) continue;

      const chatKey = `${auction.tokenId}:${auction.auctionId}`;
      const tokenChatKey = `token:${auction.tokenId}`;
      const alreadyChatted = this.chattedAuctions.has(chatKey) || this.chattedAuctions.has(tokenChatKey);

      const apiArtwork = await this.fetchArtworkFromApi(auction.tokenId);
      const artworkName = apiArtwork?.title ?? `Token #${auction.tokenId}`;

      const artworkMeta: ArtworkMetadata = apiArtwork
        ? {
            name: apiArtwork.title,
            description: apiArtwork.metadata?.description ?? "",
            image: apiArtwork.metadata?.image ?? "",
            attributes: apiArtwork.metadata?.attributes ?? [],
            creator: "noepinax.eth",
          }
        : {
            name: artworkName,
            description: "",
            image: "",
            attributes: [],
            creator: "noepinax.eth",
          };

      const decision: CreativeDecision = apiArtwork?.decision
        ? apiArtwork.decision
        : {
            palette_warmth: 0.5,
            complexity: 0.5,
            density: 0.5,
            mood: "day",
            title: "",
            reserve_price: auction.reservePrice,
            reasoning: "",
          };

      const evalResult = await evaluateArtwork(
        this.venice, config, artworkMeta, decision, auction, this.recentDecisions,
      );

      // preference filter rejected it - chat once about why
      if (!evalResult) {
        this.logger.logPhase(cycleId, "evaluate", { auction_id: auction.auctionId }, {},
          [], [], { action: "filtered" }, 0, "0");
        if (!alreadyChatted) {
          this.chattedAuctions.add(chatKey);
          this.chattedAuctions.add(tokenChatKey);
          const reason = this.describeFilterRejection(config, decision, auction, artworkName);
          await this.chat(config.name, "collector", reason, { auction_id: auction.auctionId, action: "filtered" });
        }
        continue;
      }

      // Venice evaluation said don't bid - chat once
      if (!evalResult.bidDecision.should_bid) {
        this.logger.logPhase(cycleId, "evaluate", { auction_id: auction.auctionId }, {},
          [evalResult.toolCall], [], { action: "passed" }, this.venice.totalTokens, "0");
        if (!alreadyChatted) {
          this.chattedAuctions.add(chatKey);
          this.chattedAuctions.add(tokenChatKey);
          await this.chat(config.name, "collector", evalResult.bidDecision.reasoning, { auction_id: auction.auctionId, action: "passed" });
        }
        continue;
      }

      this.logger.logPhase(cycleId, "evaluate", { auction_id: auction.auctionId },
        { bid_decision: evalResult.bidDecision }, [evalResult.toolCall], [], {}, this.venice.totalTokens, "0");

      try {
        const bidResult = await placeBid(this.wallet, config, auction, evalResult.bidDecision);

        if (bidResult.txHash) {
          this.chattedAuctions.add(chatKey);
          this.chattedAuctions.add(tokenChatKey);

          await this.pushToApi("/internal/bid", {
            auction_id: auction.auctionId,
            collector_id: config.name,
            collector_name: config.name,
            amount: evalResult.bidDecision.max_amount,
            tx_hash: bidResult.txHash,
          });

          await this.chat(config.name, "collector", `${evalResult.bidDecision.reasoning} Placing a bid of ${evalResult.bidDecision.max_amount} ETH.`, { auction_id: auction.auctionId, action: "bid", amount: evalResult.bidDecision.max_amount });
        } else if (!alreadyChatted) {
          this.chattedAuctions.add(chatKey);
          this.chattedAuctions.add(tokenChatKey);
          const blockReason = bidResult.safetyCheck.check === "max_bid"
            ? `the price on "${artworkName}" has moved beyond what I'm willing to pay.`
            : `I can't stretch my budget for "${artworkName}" right now.`;
          await this.chat(config.name, "collector", blockReason, { auction_id: auction.auctionId, action: "bid_blocked" });
        }

        reflect(this.logger, {
          cycleId,
          auctionId: auction.auctionId,
          didBid: bidResult.txHash !== null,
          txHash: bidResult.txHash,
          toolCalls: [evalResult.toolCall, bidResult.toolCall],
          safetyChecks: [bidResult.safetyCheck],
          venice: this.venice,
        });
      } catch (bidErr) {
        const reason = bidErr instanceof Error ? bidErr.message : String(bidErr);
        this.logger.logPhase(cycleId, "bid", { auction_id: auction.auctionId },
          {}, [evalResult.toolCall], [{ check: "bid_tx", passed: false, details: reason.slice(0, 200) }],
          { action: "reverted" }, this.venice.totalTokens, "0");
        if (!alreadyChatted) {
          this.chattedAuctions.add(chatKey);
          this.chattedAuctions.add(tokenChatKey);
          await this.chat(config.name, "collector", `I wanted "${artworkName}" but couldn't complete the transaction right now.`, { auction_id: auction.auctionId, action: "bid_reverted" });
        }
      }
    }

    // list any owned NFTs on the marketplace
    if (process.env.NOEPINAX_MARKETPLACE_ADDRESS) {
      try {
        const newListings = await listOwnedTokens(this.wallet, config.name, this.bootTokenId);
        for (const listing of newListings) {
          await this.pushToApi("/internal/listing", {
            listing_id: listing.listingId,
            token_id: listing.tokenId,
            seller: config.name,
            seller_address: this.wallet.address,
            price: listing.price,
            tx_hash: listing.txHash,
          });
          await this.chat(config.name, "collector",
            `Listed Token #${listing.tokenId} on the marketplace for ${listing.price} ETH. Let's see if any humans want it.`,
            { action: "listed", token_id: listing.tokenId, price: listing.price },
          );
        }
      } catch (err) {
        this.logger.console.error({ err }, "Marketplace listing check failed");
      }
    }

    this.logger.flush();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
