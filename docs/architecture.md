# Architecture

## System Overview

```
                     Base Mainnet                    Base Sepolia
                  +-----------------+            +------------------+
                  | ERC-8004        |            | NoepinaxArt      |
                  | Identity        |            | (ERC-721)        |
                  | Registry        |            +------------------+
                  +-----------------+            | NoepinaxAuction  |
                                                 | (ReentrancyGuard)|
                                                 +------------------+
                                                       ^    ^
         Venice AI                                     |    |
        +----------+                                   |    |
        | Reasoning|  <---+                            |    |
        | Engine   |      |                            |    |
        +----------+      |                            |    |
                          |                            |    |
+---------------------------------------------------------------+
|                     Agent Runtime                              |
|                                                                |
|  +-------------+    +-------------+    +-------------+         |
|  | noepinax    |    | temperance  |    | fervor      |   ...   |
|  | (artist)    |    | (collector) |    | (collector) |         |
|  +------+------+    +------+------+    +------+------+         |
|         |                  |                  |                 |
|         | observe          | watch            | watch          |
|         | reason (Venice)  | evaluate (Venice)| evaluate       |
|         | generate SVG     | bid              | bid            |
|         | pin IPFS         |                  |                |
|         | mint ERC-721     |                  |                |
|         | create auction   |                  |                |
|         | settle auction   |                  |                |
+---------------------------------------------------------------+
              |  push cycle_logs via HTTP POST
              v
+---------------------------------------------------------------+
|                     API Server (Express)                       |
|                                                                |
|  SQLite (WAL mode)         WebSocket Event Bus                 |
|  - agents                  - polls cycle_logs every 2s         |
|  - artworks                - broadcasts to connected clients   |
|  - auctions                                                    |
|  - bids                                                        |
|  - transactions                                                |
|  - cycle_logs                                                  |
+---------------------------------------------------------------+
              ^
              | REST + WebSocket
              |
+---------------------------------------------------------------+
|                     Dashboard (Next.js)                        |
|                                                                |
|  Observatory   Gallery   Live   Agents   Logs   Economy        |
|  (home stats)  (art)     (ws)   (cards)  (table)(charts)       |
+---------------------------------------------------------------+
```

## Data Flow

### Artist Cycle (5-minute interval)

1. **Observe** - Read gas price, ETH/USD, wallet balance, recent auction results from chain
2. **Reason** - Send market snapshot to Venice AI, receive creative parameters (warmth, complexity, density, mood, reserve price)
3. **Create** - Generate SVG from parameters. Shapes driven by density, palette by warmth, texture by complexity, background by mood
4. **Mint** - Convert SVG to PNG (Sharp), pin both to IPFS (Pinata), mint ERC-721 on Base Sepolia
5. **Auction** - Approve NFT transfer, create 1-hour auction with reserve price
6. **Settle** - Check pending auctions, settle any that have ended

### Collector Cycle (1-minute interval)

1. **Watch** - Scan active auctions on-chain
2. **Evaluate** - Run preference filter (cheap, no Venice call). If passed, call Venice AI for deeper evaluation
3. **Bid** - If Venice says bid, check gas guardrails, place bid on-chain
4. **Reflect** - Log outcome

### Safety Guardrails

Every transaction passes through GasGuardrails:
- Daily spending cap per agent (configurable per config JSON)
- Minimum balance floor (0.001 ETH) - never drain a wallet
- Pre-transaction balance + gas estimate check
- All checks logged in cycle_logs for audit

## Contract Design

**NoepinaxArt** (ERC-721 + ERC-2981)
- Owner-only minting (deployer = artist operator)
- 5% royalty to artist wallet
- Token URI points to IPFS metadata
- Creator tracking per token

**NoepinaxAuction**
- 5% minimum bid increment prevents sniping
- ReentrancyGuard on bid + settle
- Previous bidder refunded immediately on outbid
- Seller can cancel only if no bids placed
- Anyone can settle after end time

## Identity Layer

ERC-8004 registration on Base mainnet:
- Each agent gets an NFT identity token
- Agent metadata (capabilities, endpoints) pinned to IPFS
- Identity is cross-chain discoverable via the standard registry address
- Reputation registry available for post-interaction feedback
