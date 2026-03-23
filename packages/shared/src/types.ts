export interface AgentIdentity {
  erc8004_id: string;
  ens_name: string;
  wallet_address: `0x${string}`;
  operator_address: `0x${string}`;
  role: "artist" | "collector";
  name: string;
  personality: string;
  capabilities: string[];
  service_endpoints: Array<{ type: string; url: string }>;
}

export interface MarketSnapshot {
  gas_gwei: number;
  eth_usd: number;
  wallet_balance: string;
  recent_auctions: AuctionResult[];
  timestamp: string;
}

export interface AuctionResult {
  auction_id: string;
  token_id: number;
  final_price: string;
  winner: string | null;
  bid_count: number;
  settled: boolean;
}

export interface CreativeDecision {
  palette_warmth: number;
  complexity: number;
  density: number;
  mood: "dawn" | "day" | "dusk" | "night";
  title: string;
  reserve_price: string;
  reasoning: string;
}

export interface Artwork {
  id: number;
  token_id: number;
  title: string;
  ipfs_uri: string;
  image_url: string;
  metadata: ArtworkMetadata;
  snapshot: MarketSnapshot;
  decision: CreativeDecision;
  created_at: string;
}

export interface ArtworkMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
  creator: string;
}

export interface Auction {
  auction_id: string;
  artwork_id: number;
  token_id: number;
  reserve_price: string;
  current_bid: string;
  current_bidder: string | null;
  winner: string | null;
  final_price: string | null;
  status: "active" | "settled" | "expired" | "cancelled";
  start_time: string;
  end_time: string;
  bids: Bid[];
}

export interface Bid {
  id: number;
  collector_id: string;
  collector_name: string;
  amount: string;
  tx_hash: string;
  timestamp: string;
}

export interface BidDecision {
  collector_id: string;
  auction_id: string;
  should_bid: boolean;
  max_amount: string;
  reasoning: string;
}

export interface CycleLog {
  cycle_id: string;
  agent_id: string;
  timestamp: string;
  phase:
    | "observe"
    | "reason"
    | "create"
    | "mint"
    | "settle"
    | "watch"
    | "evaluate"
    | "bid"
    | "reflect";
  inputs: Record<string, unknown>;
  decisions: Record<string, unknown>;
  tool_calls: ToolCall[];
  safety_checks: SafetyCheck[];
  outcome: Record<string, unknown>;
  compute_budget: { venice_tokens: number; gas_wei: string };
}

export interface ToolCall {
  tool: string;
  action?: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  duration_ms: number;
  tx_hash?: string;
  gas_used?: number;
}

export interface SafetyCheck {
  check: string;
  passed: boolean;
  remaining?: string;
  details?: string;
}

export interface CollectorConfig {
  name: string;
  role: "collector";
  personality: string;
  max_bid: string;
  bidding_style: "passive" | "aggressive" | "selective" | "contrarian" | "novelty";
  daily_gas_limit: string;
  cycle_interval_ms: number;
  preferences: {
    complexity_min?: number;
    complexity_max?: number;
    warmth_min?: number;
    warmth_max?: number;
    moods?: string[];
    only_unbid?: boolean;
    divergence_threshold?: number;
  };
}

export interface ArtistConfig {
  name: string;
  role: "artist";
  personality: string;
  daily_gas_limit: string;
  cycle_interval_ms: number;
}

export type AgentConfig = ArtistConfig | CollectorConfig;

export interface WSEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export type WSEventType =
  | "cycle:start"
  | "cycle:observe"
  | "cycle:reason"
  | "cycle:create"
  | "cycle:mint"
  | "auction:created"
  | "collector:evaluate"
  | "auction:bid"
  | "auction:settle"
  | "budget:update"
  | "agent:error";
