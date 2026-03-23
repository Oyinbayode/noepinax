import "dotenv/config";
import express from "express";
import cors from "cors";
import expressWs from "express-ws";
import { getDb } from "./db/init.js";
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

const db = getDb();
const broadcaster = new EventBroadcaster(db);

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
app.post("/internal/seed-agent", (req, res) => {
  const { id, name, role, wallet_address, personality } = req.body;
  const stmt = db.prepare(
    `INSERT INTO agents (id, name, role, wallet_address, personality, status)
     VALUES (?, ?, ?, ?, ?, 'idle')
     ON CONFLICT(id) DO UPDATE SET
       wallet_address = excluded.wallet_address,
       personality = excluded.personality`
  );
  stmt.run(id, name, role, wallet_address, personality);
  res.json({ ok: true });
});

app.post("/internal/events", (req, res) => {
  const { agent_id, cycle_id, phase, log_data } = req.body;
  const stmt = db.prepare(
    "INSERT INTO cycle_logs (agent_id, cycle_id, phase, log_data) VALUES (?, ?, ?, ?)"
  );
  stmt.run(agent_id, cycle_id, phase, JSON.stringify(log_data));
  res.json({ ok: true });
});

app.post("/internal/artwork", (req, res) => {
  const { token_id, title, ipfs_uri, image_url, metadata, snapshot, decision } = req.body;
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO artworks (token_id, title, ipfs_uri, image_url, metadata, snapshot, decision) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  stmt.run(token_id, title, ipfs_uri, image_url || "", JSON.stringify(metadata), JSON.stringify(snapshot), JSON.stringify(decision));
  const row = db.prepare("SELECT id FROM artworks WHERE token_id = ?").get(token_id) as any;
  res.json({ ok: true, artwork_id: row?.id });
});

app.post("/internal/chat", (req, res) => {
  const { agent_name, agent_role, message, context } = req.body;
  const stmt = db.prepare(
    "INSERT INTO chat_messages (agent_name, agent_role, message, context) VALUES (?, ?, ?, ?)"
  );
  stmt.run(agent_name, agent_role, message, context ? JSON.stringify(context) : null);
  res.json({ ok: true });
});

app.post("/internal/auction", (req, res) => {
  const { id, artwork_id, token_id, reserve_price, start_time, end_time, tx_hash } = req.body;
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO auctions (id, artwork_id, token_id, reserve_price, status, start_time, end_time, tx_hash) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)"
  );
  stmt.run(String(id), artwork_id, token_id, reserve_price, start_time, end_time, tx_hash || "");
  res.json({ ok: true });
});

app.post("/internal/bid", (req, res) => {
  const { auction_id, collector_id, collector_name, amount, tx_hash } = req.body;
  db.prepare(
    "INSERT INTO bids (auction_id, collector_id, collector_name, amount, tx_hash) VALUES (?, ?, ?, ?, ?)"
  ).run(String(auction_id), collector_id, collector_name, amount, tx_hash || "");

  db.prepare(
    "UPDATE auctions SET current_bid = ?, current_bidder = ? WHERE id = ?"
  ).run(amount, collector_name, String(auction_id));

  res.json({ ok: true });
});

app.post("/internal/listing", (req, res) => {
  const { listing_id, token_id, seller, seller_address, price, tx_hash } = req.body;
  db.prepare(
    "INSERT OR IGNORE INTO marketplace_listings (listing_id, token_id, seller, seller_address, price, tx_hash) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(listing_id, token_id, seller, seller_address, price, tx_hash || "");
  res.json({ ok: true });
});

app.post("/internal/sale", (req, res) => {
  const { listing_id, buyer, buyer_address, tx_hash } = req.body;
  db.prepare(
    "UPDATE marketplace_listings SET status = 'sold', buyer = ?, buyer_address = ?, tx_hash = ?, sold_at = datetime('now') WHERE listing_id = ?"
  ).run(buyer, buyer_address, tx_hash || "", listing_id);

  const listing = db.prepare("SELECT token_id, buyer FROM marketplace_listings WHERE listing_id = ?").get(listing_id) as any;
  if (listing) {
    db.prepare("UPDATE artworks SET owner = ? WHERE token_id = ?").run(buyer || buyer_address, listing.token_id);
  }
  res.json({ ok: true });
});

app.post("/internal/settle", (req, res) => {
  const { auction_id } = req.body;
  const auction = db.prepare("SELECT * FROM auctions WHERE id = ?").get(String(auction_id)) as any;
  if (!auction) return res.json({ ok: false });

  const hasBids = !!auction.current_bidder;
  const winner = hasBids ? auction.current_bidder : null;
  const finalPrice = hasBids ? auction.current_bid : null;

  db.prepare(
    "UPDATE auctions SET status = 'settled', winner = ?, final_price = ? WHERE id = ?"
  ).run(winner, finalPrice, String(auction_id));

  if (hasBids && auction.artwork_id) {
    db.prepare("UPDATE artworks SET owner = ? WHERE id = ?").run(winner, auction.artwork_id);
  }

  res.json({ ok: true, sold: hasBids, winner, final_price: finalPrice, token_id: auction.token_id });
});

// backfill image URLs for artworks that have metadata JSON URIs instead of image URIs
(async () => {
  const stale = db.prepare(
    "SELECT id, ipfs_uri, image_url FROM artworks WHERE image_url IS NULL OR image_url = '' OR image_url LIKE '%pinJSONToIPFS%' OR image_url = ipfs_uri"
  ).all() as Array<{ id: number; ipfs_uri: string; image_url: string }>;

  if (stale.length === 0) return;
  console.log(`[noepinax-api] backfilling ${stale.length} artwork image URLs`);

  const update = db.prepare("UPDATE artworks SET image_url = ? WHERE id = ?");

  for (const row of stale) {
    try {
      const metaUri = row.ipfs_uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
      const res = await fetch(metaUri);
      if (!res.ok) continue;
      const meta = await res.json() as Record<string, any>;
      if (meta.image) {
        const imageUrl = (meta.image as string).replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
        update.run(imageUrl, row.id);
        console.log(`[noepinax-api] backfilled artwork #${row.id}: ${imageUrl}`);
      }
    } catch {}
  }
})();

app.listen(port, "0.0.0.0", () => {
  console.log(`[noepinax-api] running on port ${port}`);
});
