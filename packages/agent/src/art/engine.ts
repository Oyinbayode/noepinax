import type { CreativeDecision, MarketSnapshot } from "@noepinax/shared";
import { ART_DIMENSIONS } from "@noepinax/shared";
import { gradientPair, accentColor, shapeColor } from "./palettes.js";
import { moodTemplate } from "./templates.js";

const PHI = 1.618033988749895;

interface GeneratedArtwork {
  svg: string;
  title: string;
  sequenceNumber: number;
}

export function generateArtwork(
  decision: CreativeDecision,
  snapshot: MarketSnapshot,
  sequenceNumber: number,
): GeneratedArtwork {
  const { width, height } = ART_DIMENSIONS;
  const { palette_warmth, complexity, density, mood } = decision;

  const template = moodTemplate(mood, palette_warmth, width, height);
  const shapeCount = Math.round(density * 40);
  const accent = accentColor(palette_warmth);

  let shapes = "";

  // primary shapes driven by density
  for (let i = 0; i < shapeCount; i++) {
    shapes += primaryShape(i, shapeCount, palette_warmth, width, height);
  }

  // secondary texture driven by complexity
  shapes += textureLayer(complexity, width, height, template.luminosity);

  // accent elements at golden-ratio positions
  shapes += goldenAccents(accent, width, height, template.overlayOpacity);

  // subtle data typography
  shapes += typographyLayer(snapshot, width, height, template.luminosity);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${template.backgroundSvg}
${shapes}
</svg>`;

  const title = decision.title || `Untitled #${sequenceNumber}`;

  return { svg, title, sequenceNumber };
}

function primaryShape(
  index: number,
  total: number,
  warmth: number,
  width: number,
  height: number,
): string {
  const color = shapeColor(warmth, index, total);
  const seed = index * 7919 + 1;
  const x = (seededRandom(seed) * width) % width;
  const y = (seededRandom(seed + 1) * height) % height;
  const maxSize = Math.max(20, (width / total) * 1.5);
  const size = 10 + seededRandom(seed + 2) * maxSize;
  const opacity = 0.15 + seededRandom(seed + 3) * 0.45;
  const rotation = seededRandom(seed + 4) * 360;

  const variant = index % 4;

  switch (variant) {
    case 0:
      return `<circle cx="${x}" cy="${y}" r="${size}" fill="${color}" opacity="${opacity}"/>`;
    case 1:
      return `<rect x="${x}" y="${y}" width="${size * 1.6}" height="${size}" rx="${size * 0.1}" fill="${color}" opacity="${opacity}" transform="rotate(${rotation} ${x} ${y})"/>`;
    case 2: {
      const points = polygonPoints(x, y, size, 5 + (index % 3));
      return `<polygon points="${points}" fill="${color}" opacity="${opacity}"/>`;
    }
    case 3:
      return `<ellipse cx="${x}" cy="${y}" rx="${size * 1.3}" ry="${size * 0.7}" fill="${color}" opacity="${opacity}" transform="rotate(${rotation} ${x} ${y})"/>`;
    default:
      return "";
  }
}

function textureLayer(complexity: number, width: number, height: number, luminosity: number): string {
  if (complexity < 0.2) return "";

  let texture = "";
  const strokeColor = luminosity > 0.5 ? "rgba(0,0,0," : "rgba(255,255,255,";
  const baseOpacity = 0.03 + complexity * 0.06;

  if (complexity < 0.5) {
    // grid lines
    const spacing = Math.max(40, 200 - complexity * 300);
    for (let x = spacing; x < width; x += spacing) {
      texture += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${strokeColor}${baseOpacity})" stroke-width="1"/>`;
    }
    for (let y = spacing; y < height; y += spacing) {
      texture += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${strokeColor}${baseOpacity})" stroke-width="1"/>`;
    }
  } else if (complexity < 0.75) {
    // concentric rings
    const ringCount = Math.round(5 + complexity * 15);
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.hypot(cx, cy);
    for (let i = 1; i <= ringCount; i++) {
      const r = (i / ringCount) * maxR;
      texture += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${strokeColor}${baseOpacity})" stroke-width="${1 + complexity}"/>`;
    }
  } else {
    // dense crosshatch
    const spacing = Math.max(20, 100 - complexity * 80);
    for (let i = -width; i < width + height; i += spacing) {
      texture += `<line x1="${i}" y1="0" x2="${i + height}" y2="${height}" stroke="${strokeColor}${baseOpacity * 0.7})" stroke-width="0.5"/>`;
      texture += `<line x1="${i}" y1="${height}" x2="${i + height}" y2="0" stroke="${strokeColor}${baseOpacity * 0.7})" stroke-width="0.5"/>`;
    }
  }

  return texture;
}

function goldenAccents(accent: string, width: number, height: number, overlayOpacity: number): string {
  let accents = "";
  const positions = [
    [width / PHI, height / PHI],
    [width - width / PHI, height / PHI],
    [width / PHI, height - height / PHI],
    [width / 2, height / 2],
  ];

  for (let i = 0; i < positions.length; i++) {
    const [x, y] = positions[i];
    const size = 15 + i * 8;
    accents += `<circle cx="${x}" cy="${y}" r="${size}" fill="${accent}" opacity="${0.2 + overlayOpacity}"/>`;
    accents += `<circle cx="${x}" cy="${y}" r="${size * 0.4}" fill="${accent}" opacity="${0.35 + overlayOpacity}"/>`;
  }

  return accents;
}

function typographyLayer(snapshot: MarketSnapshot, width: number, height: number, luminosity: number): string {
  const textColor = luminosity > 0.5 ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)";
  const gasText = `${Math.round(snapshot.gas_gwei)} GWEI`;
  const ethText = `$${Math.round(snapshot.eth_usd)}`;

  return `
    <text x="${width * 0.05}" y="${height * 0.95}" font-family="monospace" font-size="48" fill="${textColor}">${gasText}</text>
    <text x="${width * 0.75}" y="${height * 0.06}" font-family="monospace" font-size="36" fill="${textColor}">${ethText}</text>`;
}

function polygonPoints(cx: number, cy: number, radius: number, sides: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
