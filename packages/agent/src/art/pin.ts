import type { ArtworkMetadata } from "@noepinax/shared";

const PINATA_API = "https://api.pinata.cloud";
const MAX_RETRIES = 3;

function getJwt(): string {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT not set");
  return jwt;
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const backoff = 1000 * 2 ** attempt;
        console.warn(`[pinata] ${label} attempt ${attempt + 1} failed, retrying in ${backoff}ms`);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }
  throw lastError;
}

async function pinJson(data: unknown): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(`${PINATA_API}/pinning/pinJSONToIPFS`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getJwt()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pinataContent: data }),
    });
    if (!res.ok) throw new Error(`Pinata JSON upload failed: ${res.status} ${await res.text()}`);
    const json = await res.json() as { IpfsHash: string };
    return json.IpfsHash;
  }, "pinJson");
}

async function pinFile(png: Buffer, filename: string): Promise<string> {
  return withRetry(async () => {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(png)], { type: "image/png" });
    form.append("file", blob, filename);

    const res = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getJwt()}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Pinata file upload failed: ${res.status} ${await res.text()}`);
    const json = await res.json() as { IpfsHash: string };
    return json.IpfsHash;
  }, "pinFile");
}

export async function pinArtwork(
  png: Buffer,
  metadata: ArtworkMetadata,
): Promise<{ imageUri: string; metadataUri: string }> {
  const imageCid = await pinFile(png, `${metadata.name}.png`);

  const fullMetadata = {
    ...metadata,
    image: `ipfs://${imageCid}`,
  };

  const metadataCid = await pinJson(fullMetadata);

  return {
    imageUri: `ipfs://${imageCid}`,
    metadataUri: `ipfs://${metadataCid}`,
  };
}
