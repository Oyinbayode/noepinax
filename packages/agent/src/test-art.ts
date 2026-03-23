import { generateArtwork } from "./art/engine.js";
import { svgToPng } from "./art/export.js";
import { writeFileSync, mkdirSync } from "fs";
import type { CreativeDecision, MarketSnapshot } from "@noepinax/shared";

const testCases: Array<{ decision: CreativeDecision; snapshot: MarketSnapshot }> = [
  {
    decision: { palette_warmth: 0.2, complexity: 0.1, density: 0.15, mood: "dawn", title: "Stillwater Protocol", reserve_price: "0.005", reasoning: "test" },
    snapshot: { gas_gwei: 12, eth_usd: 2400, wallet_balance: "0.1", recent_auctions: [], timestamp: new Date().toISOString() },
  },
  {
    decision: { palette_warmth: 0.85, complexity: 0.8, density: 0.7, mood: "day", title: "Ember Lattice", reserve_price: "0.01", reasoning: "test" },
    snapshot: { gas_gwei: 85, eth_usd: 2600, wallet_balance: "0.05", recent_auctions: [], timestamp: new Date().toISOString() },
  },
  {
    decision: { palette_warmth: 0.6, complexity: 0.5, density: 0.4, mood: "dusk", title: "Meridian Haze", reserve_price: "0.008", reasoning: "test" },
    snapshot: { gas_gwei: 40, eth_usd: 2500, wallet_balance: "0.08", recent_auctions: [], timestamp: new Date().toISOString() },
  },
  {
    decision: { palette_warmth: 0.1, complexity: 0.9, density: 0.9, mood: "night", title: "Void Frequency 003", reserve_price: "0.003", reasoning: "test" },
    snapshot: { gas_gwei: 5, eth_usd: 2300, wallet_balance: "0.02", recent_auctions: [], timestamp: new Date().toISOString() },
  },
  {
    decision: { palette_warmth: 0.95, complexity: 0.3, density: 0.05, mood: "dawn", title: "Pulse Remnant", reserve_price: "0.012", reasoning: "test" },
    snapshot: { gas_gwei: 120, eth_usd: 2800, wallet_balance: "0.15", recent_auctions: [], timestamp: new Date().toISOString() },
  },
];

async function main() {
  mkdirSync("output", { recursive: true });

  for (let i = 0; i < testCases.length; i++) {
    const { decision, snapshot } = testCases[i];
    const artwork = generateArtwork(decision, snapshot, i + 1);
    const png = await svgToPng(artwork.svg);

    writeFileSync(`output/test_${i + 1}.svg`, artwork.svg);
    writeFileSync(`output/test_${i + 1}.png`, png);
    console.log(`#${i + 1}: "${artwork.title}" (${(png.length / 1024).toFixed(1)}KB)`);
  }

  console.log("\nDone. Check output/ folder.");
}

main().catch(console.error);
