import OpenAI from "openai";
import { z } from "zod";
import type { MarketSnapshot, CreativeDecision, ArtworkMetadata } from "@noepinax/shared";
import { VENICE_API } from "@noepinax/shared";

const CreativeDecisionSchema = z.object({
  palette_warmth: z.number().min(0).max(1),
  complexity: z.number().min(0).max(1),
  density: z.number().min(0).max(1),
  mood: z.enum(["dawn", "day", "dusk", "night"]),
  title: z.string(),
  reserve_price: z.string(),
  reasoning: z.string(),
});

const BidDecisionSchema = z.object({
  should_bid: z.boolean(),
  max_amount: z.string(),
  reasoning: z.string(),
});

export interface CollectorBidDecision {
  should_bid: boolean;
  max_amount: string;
  reasoning: string;
}

export class VeniceClient {
  private openai: OpenAI;
  private model: string;
  totalTokens = 0;

  constructor(apiKey: string, model = "llama-3.3-70b") {
    this.openai = new OpenAI({
      apiKey,
      baseURL: VENICE_API.baseUrl,
    });
    this.model = model;
  }

  async reason(snapshot: MarketSnapshot, systemPrompt: string): Promise<CreativeDecision> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Current market state:\n${JSON.stringify(snapshot, null, 2)}\n\nRespond with a JSON object containing: palette_warmth (0-1), complexity (0-1), density (0-1), mood (dawn|day|dusk|night), title (a short, evocative, original artwork title - poetic and unique, never generic), reserve_price (ETH string like "0.005"), reasoning (brief explanation).`,
        },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    this.totalTokens += response.usage?.total_tokens ?? 0;

    const content = response.choices[0]?.message?.content ?? "";
    const parsed = extractJson(content);
    return CreativeDecisionSchema.parse(parsed);
  }

  async evaluate(
    artwork: ArtworkMetadata,
    auctionDetails: { reserve_price: string; current_bid: string; bid_count: number },
    systemPrompt: string,
  ): Promise<CollectorBidDecision> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Artwork for evaluation:\n${JSON.stringify(artwork, null, 2)}\n\nAuction state:\n${JSON.stringify(auctionDetails, null, 2)}\n\nRespond with a JSON object containing: should_bid (boolean), max_amount (ETH string like "0.01"), reasoning (brief explanation).`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    this.totalTokens += response.usage?.total_tokens ?? 0;

    const content = response.choices[0]?.message?.content ?? "";
    const parsed = extractJson(content);
    return BidDecisionSchema.parse(parsed);
  }
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {}

  const blockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (blockMatch) {
    return JSON.parse(blockMatch[1].trim());
  }

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    return JSON.parse(braceMatch[0]);
  }

  throw new Error(`Could not extract JSON from Venice response: ${text.slice(0, 200)}`);
}
