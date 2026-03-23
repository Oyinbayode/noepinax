import type Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";

type Queries = Record<string, BetterSqlite3.Statement>;

export function createQueries(db: Database.Database): Queries {
  return {
    // agents
    getAllAgents: db.prepare("SELECT * FROM agents ORDER BY role, name"),
    getAgent: db.prepare("SELECT * FROM agents WHERE id = ?"),
    upsertAgent: db.prepare(`
      INSERT INTO agents (id, name, role, erc8004_id, ens_name, wallet_address, personality, status)
      VALUES (@id, @name, @role, @erc8004_id, @ens_name, @wallet_address, @personality, @status)
      ON CONFLICT(id) DO UPDATE SET
        erc8004_id = @erc8004_id, status = @status
    `),

    // artworks
    getArtworks: db.prepare("SELECT * FROM artworks ORDER BY created_at DESC LIMIT ? OFFSET ?"),
    getArtwork: db.prepare("SELECT * FROM artworks WHERE id = ?"),
    getArtworkCount: db.prepare("SELECT COUNT(*) as count FROM artworks"),
    insertArtwork: db.prepare(`
      INSERT INTO artworks (token_id, title, ipfs_uri, image_url, metadata, snapshot, decision)
      VALUES (@token_id, @title, @ipfs_uri, @image_url, @metadata, @snapshot, @decision)
    `),

    // auctions
    getAuctions: db.prepare("SELECT * FROM auctions ORDER BY start_time DESC LIMIT ? OFFSET ?"),
    getActiveAuctions: db.prepare("SELECT * FROM auctions WHERE status = 'active'"),
    getAuction: db.prepare("SELECT * FROM auctions WHERE id = ?"),
    insertAuction: db.prepare(`
      INSERT INTO auctions (id, artwork_id, token_id, reserve_price, status, start_time, end_time, tx_hash)
      VALUES (@id, @artwork_id, @token_id, @reserve_price, @status, @start_time, @end_time, @tx_hash)
    `),
    updateAuction: db.prepare(`
      UPDATE auctions SET current_bid = @current_bid, current_bidder = @current_bidder,
        winner = @winner, final_price = @final_price, status = @status WHERE id = @id
    `),

    // bids
    getBidsForAuction: db.prepare("SELECT * FROM bids WHERE auction_id = ? ORDER BY timestamp DESC"),
    getBidsForArtwork: db.prepare(`
      SELECT b.* FROM bids b
      JOIN auctions a ON a.id = b.auction_id
      WHERE a.artwork_id = ?
      ORDER BY b.timestamp DESC
    `),
    insertBid: db.prepare(`
      INSERT INTO bids (auction_id, collector_id, collector_name, amount, tx_hash)
      VALUES (@auction_id, @collector_id, @collector_name, @amount, @tx_hash)
    `),

    // transactions
    getTransactions: db.prepare("SELECT * FROM transactions WHERE agent_id = ? ORDER BY timestamp DESC LIMIT ?"),
    insertTransaction: db.prepare(`
      INSERT INTO transactions (agent_id, type, tx_hash, gas_used)
      VALUES (@agent_id, @type, @tx_hash, @gas_used)
    `),

    // cycle logs
    getLogs: db.prepare(`
      SELECT * FROM cycle_logs
      WHERE CASE WHEN @agent_id = 'all' THEN 1 ELSE agent_id = @agent_id END
      ORDER BY timestamp DESC LIMIT @limit OFFSET @offset
    `),
    getLogCount: db.prepare(`
      SELECT COUNT(*) as count FROM cycle_logs
      WHERE CASE WHEN @agent_id = 'all' THEN 1 ELSE agent_id = @agent_id END
    `),
    insertLog: db.prepare(`
      INSERT INTO cycle_logs (agent_id, cycle_id, phase, log_data)
      VALUES (@agent_id, @cycle_id, @phase, @log_data)
    `),
    getRecentLogs: db.prepare("SELECT * FROM cycle_logs WHERE id > ? ORDER BY id ASC"),

    // economy
    getPriceTrends: db.prepare(`
      SELECT a.created_at, a.title, au.reserve_price, au.current_bid, au.current_bidder, au.final_price, au.status
      FROM artworks a LEFT JOIN auctions au ON au.artwork_id = a.id
      ORDER BY a.created_at ASC
    `),
    getCollectorStats: db.prepare(`
      SELECT collector_name, COUNT(*) as bid_count, SUM(CAST(amount AS REAL)) as total_spent
      FROM bids GROUP BY collector_name
    `),
    getEarningsByDay: db.prepare(`
      SELECT date(a.created_at) as day, COUNT(*) as sales, SUM(CAST(au.final_price AS REAL)) as revenue
      FROM auctions au JOIN artworks a ON au.artwork_id = a.id
      WHERE au.status = 'settled' AND au.final_price IS NOT NULL
      GROUP BY date(a.created_at) ORDER BY day ASC
    `),
  };
}
