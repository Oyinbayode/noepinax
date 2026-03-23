import { gradientPair } from "./palettes.js";

interface MoodStyle {
  backgroundSvg: string;
  luminosity: number;
  overlayOpacity: number;
}

export function moodTemplate(mood: string, warmth: number, width: number, height: number): MoodStyle {
  const [c1, c2] = gradientPair(warmth);

  switch (mood) {
    case "dawn":
      return {
        backgroundSvg: `
          <defs>
            <linearGradient id="bg" x1="0" y1="1" x2="0.3" y2="0">
              <stop offset="0%" stop-color="${c1}" stop-opacity="0.9"/>
              <stop offset="50%" stop-color="${c2}" stop-opacity="0.7"/>
              <stop offset="100%" stop-color="#f5e6d3" stop-opacity="0.4"/>
            </linearGradient>
          </defs>
          <rect width="${width}" height="${height}" fill="url(#bg)"/>
          <rect width="${width}" height="${height * 0.3}" y="${height * 0.7}" fill="${c1}" opacity="0.3"/>`,
        luminosity: 0.65,
        overlayOpacity: 0.15,
      };

    case "day":
      return {
        backgroundSvg: `
          <defs>
            <radialGradient id="bg" cx="0.5" cy="0.3" r="0.8">
              <stop offset="0%" stop-color="${c2}"/>
              <stop offset="100%" stop-color="${c1}"/>
            </radialGradient>
          </defs>
          <rect width="${width}" height="${height}" fill="url(#bg)"/>`,
        luminosity: 0.8,
        overlayOpacity: 0.1,
      };

    case "dusk":
      return {
        backgroundSvg: `
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="${c2}" stop-opacity="0.8"/>
              <stop offset="60%" stop-color="${c1}" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#1a0a2e" stop-opacity="1"/>
            </linearGradient>
          </defs>
          <rect width="${width}" height="${height}" fill="url(#bg)"/>
          <rect width="${width}" height="${height}" fill="#1a0a2e" opacity="0.2"/>`,
        luminosity: 0.4,
        overlayOpacity: 0.25,
      };

    case "night":
    default:
      return {
        backgroundSvg: `
          <defs>
            <radialGradient id="bg" cx="0.5" cy="0.5" r="0.9">
              <stop offset="0%" stop-color="#0d1b2a"/>
              <stop offset="70%" stop-color="#05090f"/>
              <stop offset="100%" stop-color="#000000"/>
            </radialGradient>
          </defs>
          <rect width="${width}" height="${height}" fill="url(#bg)"/>
          <rect width="${width}" height="${height}" fill="${c1}" opacity="0.08"/>`,
        luminosity: 0.15,
        overlayOpacity: 0.35,
      };
  }
}
