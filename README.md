# Noepinax

Autonomous multi-agent art economy on Ethereum (Base L2). Six AI agents form a self-sustaining creative marketplace: one artist generates blockchain-driven generative art, five collectors with distinct personalities bid autonomously.

## Architecture

```
contracts/          Solidity - NoepinaxArt (ERC-721) + NoepinaxAuction
packages/
  shared/           Types, constants, ABIs shared across packages
  agent/            Agent runtime - artist + 5 collector personalities
  api/              Express + SQLite + WebSocket event bus
  dashboard/        Next.js real-time monitoring dashboard
scripts/            Seed, deploy, register, orchestrate
```

### Agents

| Agent | Role | Personality | Strategy |
|-------|------|-------------|----------|
| **noepinax** | Artist | Absorbs blockchain state, expresses as generative SVG | Maps gas/ETH price/time to art parameters |
| **temperance** | Collector | Meditative, patient | Only bids on calm, minimal art (low complexity + cool palette) |
| **fervor** | Collector | Passionate, impulsive | Chases intensity - high complexity or warmth |
| **dusk** | Collector | Mysterious, selective | Exclusively collects nocturnal/dusk mood pieces |
| **contrarian** | Collector | Bargain hunter | Only bids on pieces nobody else wants |
| **echo** | Collector | Curious, novelty-seeking | Rewards creative divergence from recent output |

### How Art Gets Made

1. Artist observes on-chain state (gas price, ETH/USD, wallet balance, recent auctions)
2. Venice AI reasons about creative parameters from market data
3. Generative engine produces SVG art - shapes, palettes, textures driven by the data
4. Art is pinned to IPFS (Pinata), minted as ERC-721 on Base Sepolia
5. Auction created with 1-hour duration
6. Collectors evaluate and bid based on their individual preferences
7. Auction settles, cycle repeats

### On-Chain Identity

Each agent is registered via [ERC-8004](https://www.8004.org) on Base mainnet - the standard agent identity registry. Agent metadata (capabilities, endpoints, wallet) is pinned to IPFS and referenced on-chain.

## Setup

```bash
pnpm install

# copy .env from parent directory or create your own
cp ../.env .env

# seed the agent database
pnpm seed

# deploy contracts to Base Sepolia (needs testnet ETH)
pnpm deploy:contracts
# then update NOEPINAX_ART_ADDRESS and NOEPINAX_AUCTION_ADDRESS in .env

# register ERC-8004 identities on Base mainnet (needs mainnet ETH)
pnpm register
```

## Run

```bash
# start everything - API server + all 6 agents
pnpm start

# or run individually
cd packages/api && pnpm dev          # API on :3001
cd packages/dashboard && pnpm dev    # Dashboard on :3000
AGENT_NAME=noepinax pnpm --filter @noepinax/agent dev
```

## Stack

- **Contracts**: Solidity 0.8.28, Hardhat, OpenZeppelin (ERC-721, ERC-2981, ReentrancyGuard)
- **Agents**: TypeScript, Viem, Venice AI (via OpenAI SDK), Sharp, Pinata IPFS
- **API**: Express, SQLite (better-sqlite3), WebSocket (express-ws)
- **Dashboard**: Next.js 14, TanStack Query, Recharts, Tailwind CSS
- **Identity**: ERC-8004 on Base mainnet
- **Monorepo**: pnpm workspaces + Turborepo

## Bounties

See [docs/bounty-mapping.md](docs/bounty-mapping.md) for detailed mapping.
