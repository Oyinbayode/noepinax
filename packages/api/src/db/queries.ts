import type { Client, InValue } from "@libsql/client";

type Args = InValue[] | Record<string, InValue>;

function resolveArgs(args: any[]): Args {
  if (args.length === 1 && typeof args[0] === "object" && args[0] !== null && !Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

export function query(db: Client, sql: string) {
  return {
    all: async (...args: any[]): Promise<any[]> => (await db.execute({ sql, args: resolveArgs(args) })).rows as any[],
    get: async (...args: any[]): Promise<any> => (await db.execute({ sql, args: resolveArgs(args) })).rows[0] as any,
    run: async (...args: any[]) => { await db.execute({ sql, args: resolveArgs(args) }); },
  };
}

export function createQueries(db: Client) {
  return {
    // agents
    getAllAgents: query(db, "SELECT * FROM agents ORDER BY role, name"),
    getAgent: query(db, "SELECT * FROM agents WHERE id = ?"),
    upsertAgent: query(db, `
      INSERT INTO agents (id, name, role, erc8004_id, ens_name, wallet_address, personality, status)
      VALUES (@id, @name, @role, @erc8004_id, @ens_name, @wallet_address, @personality, @status)
      ON CONFLICT(id) DO UPDATE SET
        erc8004_id = @erc8004_id, status = @status
    `),

    // artworks
    getArtworks: query(db, "SELECT * FROM artworks ORDER BY created_at DESC LIMIT ? OFFSET ?"),
    getArtwork: query(db, "SELECT * FROM artworks WHERE id = ?"),
    getArtworkCount: query(db, "SELECT COUNT(*) as count FROM artworks"),
    insertArtwork: query(db, `
      INSERT INTO artworks (token_id, title, ipfs_uri, image_url, metadata, snapshot, decision)
      VALUES (@token_id, @title, @ipfs_uri, @image_url, @metadata, @snapshot, @decision)
    `),

    // auctions
    getAuctions: query(db, "SELECT * FROM auctions ORDER BY start_time DESC LIMIT ? OFFSET ?"),
    getActiveAuctions: query(db, "SELECT * FROM auctions WHERE status = 'active'"),
    getAuction: query(db, "SELECT * FROM auctions WHERE id = ?"),
    insertAuction: query(db, `
      INSERT INTO auctions (id, artwork_id, token_id, reserve_price, status, start_time, end_time, tx_hash)
      VALUES (@id, @artwork_id, @token_id, @reserve_price, @status, @start_time, @end_time, @tx_hash)
    `),
    updateAuction: query(db, `
      UPDATE auctions SET current_bid = @current_bid, current_bidder = @current_bidder,
        winner = @winner, final_price = @final_price, status = @status WHERE id = @id
    `),

    // bids
    getBidsForAuction: query(db, "SELECT * FROM bids WHERE auction_id = ? ORDER BY timestamp DESC"),
    getBidsForArtwork: query(db, `
      SELECT b.* FROM bids b
      JOIN auctions a ON a.id = b.auction_id
      WHERE a.artwork_id = ?
      ORDER BY b.timestamp DESC
    `),
    insertBid: query(db, `
      INSERT INTO bids (auction_id, collector_id, collector_name, amount, tx_hash)
      VALUES (@auction_id, @collector_id, @collector_name, @amount, @tx_hash)
    `),

    // transactions
    getTransactions: query(db, "SELECT * FROM transactions WHERE agent_id = ? ORDER BY timestamp DESC LIMIT ?"),
    insertTransaction: query(db, `
      INSERT INTO transactions (agent_id, type, tx_hash, gas_used)
      VALUES (@agent_id, @type, @tx_hash, @gas_used)
    `),

    // cycle logs
    getLogs: query(db, `
      SELECT * FROM cycle_logs
      WHERE CASE WHEN @agent_id = 'all' THEN 1 ELSE agent_id = @agent_id END
      ORDER BY timestamp DESC LIMIT @limit OFFSET @offset
    `),
    getLogCount: query(db, `
      SELECT COUNT(*) as count FROM cycle_logs
      WHERE CASE WHEN @agent_id = 'all' THEN 1 ELSE agent_id = @agent_id END
    `),
    insertLog: query(db, `
      INSERT INTO cycle_logs (agent_id, cycle_id, phase, log_data)
      VALUES (@agent_id, @cycle_id, @phase, @log_data)
    `),
    getRecentLogs: query(db, "SELECT * FROM cycle_logs WHERE id > ? ORDER BY id ASC"),

    // economy
    getPriceTrends: query(db, `
      SELECT a.created_at, a.title, au.reserve_price, au.current_bid, au.current_bidder, au.final_price, au.status
      FROM artworks a LEFT JOIN auctions au ON au.artwork_id = a.id
      ORDER BY a.created_at ASC
    `),
    getCollectorStats: query(db, `
      SELECT collector_name, COUNT(*) as bid_count, SUM(CAST(amount AS REAL)) as total_spent
      FROM bids GROUP BY collector_name
    `),
    getEarningsByDay: query(db, `
      SELECT date(a.created_at) as day, COUNT(*) as sales, SUM(CAST(au.final_price AS REAL)) as revenue
      FROM auctions au JOIN artworks a ON au.artwork_id = a.id
      WHERE au.status = 'settled' AND au.final_price IS NOT NULL
      GROUP BY date(a.created_at) ORDER BY day ASC
    `),
  };
}
