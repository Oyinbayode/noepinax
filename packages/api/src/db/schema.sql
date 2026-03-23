CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  erc8004_id TEXT,
  ens_name TEXT,
  wallet_address TEXT NOT NULL,
  personality TEXT,
  status TEXT DEFAULT 'idle',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS artworks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id INTEGER UNIQUE,
  title TEXT NOT NULL,
  ipfs_uri TEXT NOT NULL,
  image_url TEXT,
  owner TEXT,
  metadata TEXT,
  snapshot TEXT,
  decision TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auctions (
  id TEXT PRIMARY KEY,
  artwork_id INTEGER REFERENCES artworks(id),
  token_id INTEGER,
  reserve_price TEXT NOT NULL,
  current_bid TEXT,
  current_bidder TEXT,
  winner TEXT,
  final_price TEXT,
  status TEXT DEFAULT 'active',
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  tx_hash TEXT
);

CREATE TABLE IF NOT EXISTS bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auction_id TEXT REFERENCES auctions(id),
  collector_id TEXT NOT NULL,
  collector_name TEXT NOT NULL,
  amount TEXT NOT NULL,
  tx_hash TEXT,
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  tx_hash TEXT,
  gas_used TEXT,
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cycle_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  log_data TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER UNIQUE,
  token_id INTEGER NOT NULL,
  seller TEXT NOT NULL,
  seller_address TEXT,
  price TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  buyer TEXT,
  buyer_address TEXT,
  tx_hash TEXT,
  sold_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  message TEXT NOT NULL,
  context TEXT,
  timestamp TEXT DEFAULT (datetime('now'))
);
