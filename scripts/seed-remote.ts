import "dotenv/config";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { privateKeyToAccount } from "viem/accounts";
import { AGENT_NAMES } from "@noepinax/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiUrl = process.env.API_URL || "http://localhost:3001";
const configDir = join(__dirname, "..", "packages", "agent", "src", "config");

for (const name of AGENT_NAMES) {
  const envKey = `AGENT_${name.toUpperCase()}_PRIVATE_KEY`;
  const pk = process.env[envKey] as `0x${string}`;
  if (!pk) {
    console.log(`skipping ${name} - no private key`);
    continue;
  }

  const address = privateKeyToAccount(pk).address;
  const configFile = name === "noepinax" ? "artist.json" : `${name}.json`;
  const config = JSON.parse(readFileSync(join(configDir, configFile), "utf-8"));

  const res = await fetch(`${apiUrl}/internal/seed-agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: name,
      name,
      role: config.role,
      wallet_address: address,
      personality: config.personality,
    }),
  });

  if (res.ok) {
    console.log(`seeded ${name} (${config.role}) -> ${address}`);
  } else {
    console.error(`failed to seed ${name}: ${res.status}`);
  }
}

console.log("\ndone.");
