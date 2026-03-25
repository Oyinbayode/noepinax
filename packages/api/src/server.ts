import dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env"), override: false });
dotenv.config({ path: resolve(process.cwd(), "../../.env"), override: false });
import express from "express";
import cors from "cors";
import expressWs from "express-ws";
import { initDb } from "./db/init.js";
import { query } from "./db/queries.js";
import { agentsRouter } from "./routes/agents.js";
import { artworksRouter } from "./routes/artworks.js";
import { auctionsRouter } from "./routes/auctions.js";
import { logsRouter } from "./routes/logs.js";
import { economyRouter } from "./routes/economy.js";
import { budgetRouter } from "./routes/budget.js";
import { chatRouter } from "./routes/chat.js";
import { marketplaceRouter } from "./routes/marketplace.js";
import { EventBroadcaster } from "./ws/events.js";

const port = parseInt(process.env.API_PORT || "3001");

const { app } = expressWs(express());
app.use(cors());
app.use(express.json());

const db = await initDb();
const broadcaster = new EventBroadcaster(db);
await broadcaster.init();

app.use("/api/agents", agentsRouter(db));
app.use("/api/artworks", artworksRouter(db));
app.use("/api/auctions", auctionsRouter(db));
app.use("/api/logs", logsRouter(db));
app.use("/api/economy", economyRouter(db));
app.use("/api/budget", budgetRouter(db));
app.use("/api/chat", chatRouter(db));
app.use("/api/marketplace", marketplaceRouter(db));

app.ws("/ws", (ws) => {
  broadcaster.addClient(ws);
  ws.send(JSON.stringify({ event: "connected", timestamp: new Date().toISOString() }));
});

// internal endpoints for agents to push data
app.post("/internal/seed-agent", async (req, res) => {
  const { id, name, role, wallet_address, personality, erc8004_id } = req.body;
  await query(db,
    `INSERT INTO agents (id, name, role, wallet_address, personality, erc8004_id, status)
     VALUES (?, ?, ?, ?, ?, ?, 'idle')
     ON CONFLICT(id) DO UPDATE SET
       wallet_address = excluded.wallet_address,
       personality = excluded.personality,
       erc8004_id = COALESCE(excluded.erc8004_id, agents.erc8004_id)`
  ).run(id, name, role, wallet_address, personality, erc8004_id || null);
  res.json({ ok: true });
});

app.post("/internal/events", async (req, res) => {
  const { agent_id, cycle_id, phase, log_data } = req.body;
  await query(db,
    "INSERT INTO cycle_logs (agent_id, cycle_id, phase, log_data) VALUES (?, ?, ?, ?)"
  ).run(agent_id, cycle_id, phase, JSON.stringify(log_data));
  res.json({ ok: true });
});

app.post("/internal/artwork", async (req, res) => {
  const { token_id, title, ipfs_uri, image_url, metadata, snapshot, decision } = req.body;
  await query(db,
    "INSERT OR IGNORE INTO artworks (token_id, title, ipfs_uri, image_url, metadata, snapshot, decision) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(token_id, title, ipfs_uri, image_url || "", JSON.stringify(metadata), JSON.stringify(snapshot), JSON.stringify(decision));
  const row = await query(db, "SELECT id FROM artworks WHERE token_id = ?").get(token_id) as any;
  res.json({ ok: true, artwork_id: row?.id });
});

app.post("/internal/chat", async (req, res) => {
  const { agent_name, agent_role, message, context } = req.body;
  await query(db,
    "INSERT INTO chat_messages (agent_name, agent_role, message, context) VALUES (?, ?, ?, ?)"
  ).run(agent_name, agent_role, message, context ? JSON.stringify(context) : null);
  res.json({ ok: true });
});

app.post("/internal/auction", async (req, res) => {
  const { id, artwork_id, token_id, reserve_price, start_time, end_time, tx_hash } = req.body;
  await query(db,
    "INSERT OR IGNORE INTO auctions (id, artwork_id, token_id, reserve_price, status, start_time, end_time, tx_hash) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)"
  ).run(String(id), artwork_id, token_id, reserve_price, start_time, end_time, tx_hash || "");
  res.json({ ok: true });
});

app.post("/internal/bid", async (req, res) => {
  const { auction_id, collector_id, collector_name, amount, tx_hash } = req.body;
  await query(db,
    "INSERT INTO bids (auction_id, collector_id, collector_name, amount, tx_hash) VALUES (?, ?, ?, ?, ?)"
  ).run(String(auction_id), collector_id, collector_name, amount, tx_hash || "");

  await query(db,
    "UPDATE auctions SET current_bid = ?, current_bidder = ? WHERE id = ?"
  ).run(amount, collector_name, String(auction_id));

  res.json({ ok: true });
});

app.post("/internal/listing", async (req, res) => {
  const { listing_id, token_id, seller, seller_address, price, tx_hash } = req.body;
  await query(db,
    "INSERT OR IGNORE INTO marketplace_listings (listing_id, token_id, seller, seller_address, price, tx_hash) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(listing_id, token_id, seller, seller_address, price, tx_hash || "");
  res.json({ ok: true });
});

app.post("/internal/sale", async (req, res) => {
  const { listing_id, buyer, buyer_address, tx_hash } = req.body;
  await query(db,
    "UPDATE marketplace_listings SET status = 'sold', buyer = ?, buyer_address = ?, tx_hash = ?, sold_at = datetime('now') WHERE listing_id = ?"
  ).run(buyer, buyer_address, tx_hash || "", listing_id);

  const listing = await query(db, "SELECT token_id, buyer FROM marketplace_listings WHERE listing_id = ?").get(listing_id) as any;
  if (listing) {
    await query(db, "UPDATE artworks SET owner = ? WHERE token_id = ?").run(buyer || buyer_address, listing.token_id);
  }
  res.json({ ok: true });
});

app.post("/internal/settle", async (req, res) => {
  const { auction_id } = req.body;
  const auction = await query(db, "SELECT * FROM auctions WHERE id = ?").get(String(auction_id)) as any;
  if (!auction) return res.json({ ok: false });

  const hasBids = !!auction.current_bidder;
  const winner = hasBids ? auction.current_bidder : null;
  const finalPrice = hasBids ? auction.current_bid : null;

  await query(db,
    "UPDATE auctions SET status = 'settled', winner = ?, final_price = ? WHERE id = ?"
  ).run(winner, finalPrice, String(auction_id));

  if (hasBids && auction.artwork_id) {
    await query(db, "UPDATE artworks SET owner = ? WHERE id = ?").run(winner, auction.artwork_id);
  }

  res.json({ ok: true, sold: hasBids, winner, final_price: finalPrice, token_id: auction.token_id });
});

// backfill image URLs for artworks that have metadata JSON URIs instead of image URIs
(async () => {
  const stale = await query(db,
    "SELECT id, ipfs_uri, image_url FROM artworks WHERE image_url IS NULL OR image_url = '' OR image_url LIKE '%pinJSONToIPFS%' OR image_url = ipfs_uri"
  ).all();

  if (stale.length === 0) return;
  console.log(`[noepinax-api] backfilling ${stale.length} artwork image URLs`);

  for (const row of stale) {
    try {
      const metaUri = (row.ipfs_uri as string).replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
      const res = await fetch(metaUri);
      if (!res.ok) continue;
      const meta = await res.json() as Record<string, any>;
      if (meta.image) {
        const imageUrl = (meta.image as string).replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
        await query(db, "UPDATE artworks SET image_url = ? WHERE id = ?").run(imageUrl, row.id);
        console.log(`[noepinax-api] backfilled artwork #${row.id}: ${imageUrl}`);
      }
    } catch {}
  }
})();

app.listen(port, "0.0.0.0", () => {
  console.log(`[noepinax-api] running on port ${port}`);
});
