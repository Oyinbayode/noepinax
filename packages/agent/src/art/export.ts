import sharp from "sharp";
import { ART_DIMENSIONS } from "@noepinax/shared";

export async function svgToPng(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg))
    .resize(ART_DIMENSIONS.width, ART_DIMENSIONS.height)
    .png({ quality: 90 })
    .toBuffer();
}
