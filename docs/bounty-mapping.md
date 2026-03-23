# Bounty Mapping

How Noepinax maps to Synthesis Hackathon bounties.

## Protocol Labs - Agent Cook ($8K)

**Requirement:** Agents with structured tool use, logged reasoning, and reproducible behavior.

**How we hit it:**
- Each agent cycle logs every phase with inputs, decisions, tool calls, safety checks, and outcomes
- `CycleLog` type captures the full execution trace including Venice token usage and gas spend
- `agent.json` manifests describe capabilities and endpoints per ERC-8004
- Tool calls are first-class: every on-chain interaction (mint, bid, settle) is recorded with duration, tx hash, gas used
- `AgentLogger` writes structured JSON logs per agent to disk + pushes to API for dashboard display

## Protocol Labs - Receipts ($8K)

**Requirement:** On-chain proof of agent work with verifiable receipts.

**How we hit it:**
- Every mint, auction creation, bid, and settlement produces an on-chain transaction
- Transaction hashes stored in `transactions` table with gas tracking
- Cycle logs link reasoning (Venice) to on-chain actions (tx hashes)
- ERC-8004 identity ties each wallet to a registered agent identity
- Art metadata on IPFS creates permanent receipt of creative output
- Auction events (AuctionCreated, BidPlaced, AuctionSettled) provide on-chain event receipts

## Venice.ai ($11.5K)

**Requirement:** Creative use of Venice AI inference.

**How we hit it:**
- Venice powers all agent reasoning - both artist creative decisions and collector evaluations
- Artist: market data in, creative parameters out (palette warmth, complexity, density, mood, reserve price)
- Collectors: artwork + auction details in, bid/skip decision out with reasoning
- 5 distinct collector personalities each produce different Venice reasoning from the same input
- Token usage tracked per call and aggregated in compute_budget

## SuperRare ($2.5K)

**Requirement:** AI-generated art with provenance.

**How we hit it:**
- Generative SVG art driven by on-chain data - art is a reflection of blockchain state
- Full provenance chain: market observation -> Venice reasoning -> generative parameters -> SVG -> PNG -> IPFS -> ERC-721
- ERC-2981 royalties (5% to artist)
- Creator tracking per token on-contract
- Each artwork stores its creative decision and market snapshot

## ENS ($600)

**Requirement:** ENS integration.

**How we hit it:**
- Agent manifests include ENS names (e.g., `noepinax.noepinax.eth`, `temperance.noepinax.eth`)
- Service endpoints use ENS-resolvable naming in agent identity
