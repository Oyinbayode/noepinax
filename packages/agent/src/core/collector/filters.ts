import type { CreativeDecision, CollectorConfig } from "@noepinax/shared";
import type { ActiveAuction } from "./watch.js";

export function passesPreferenceFilter(
  config: CollectorConfig,
  decision: CreativeDecision,
  auction: ActiveAuction,
  recentDecisions: CreativeDecision[] = [],
): boolean {
  const prefs = config.preferences;

  switch (config.bidding_style) {
    case "passive":
      // Temperance: low complexity AND low warmth
      return (
        decision.complexity <= (prefs.complexity_max ?? 1) &&
        decision.palette_warmth <= (prefs.warmth_max ?? 1)
      );

    case "aggressive":
      // Fervor: high complexity OR high warmth
      return (
        decision.complexity >= (prefs.complexity_min ?? 0) ||
        decision.palette_warmth >= (prefs.warmth_min ?? 0)
      );

    case "selective":
      // Dusk: only specific moods
      return (prefs.moods ?? []).includes(decision.mood);

    case "contrarian":
      // Contrarian: only unbid auctions
      return prefs.only_unbid ? auction.bidCount === 0 : true;

    case "novelty": {
      // Echo: high divergence from recent pieces
      if (recentDecisions.length === 0) return true;
      const avgDivergence = computeDivergence(decision, recentDecisions);
      return avgDivergence >= (prefs.divergence_threshold ?? 0.3);
    }

    default:
      return false;
  }
}

function computeDivergence(current: CreativeDecision, recent: CreativeDecision[]): number {
  let totalDist = 0;

  for (const prev of recent) {
    const warmthDiff = Math.abs(current.palette_warmth - prev.palette_warmth);
    const complexityDiff = Math.abs(current.complexity - prev.complexity);
    const densityDiff = Math.abs(current.density - prev.density);
    const moodDiff = current.mood !== prev.mood ? 0.5 : 0;

    totalDist += (warmthDiff + complexityDiff + densityDiff + moodDiff) / 4;
  }

  return totalDist / recent.length;
}
