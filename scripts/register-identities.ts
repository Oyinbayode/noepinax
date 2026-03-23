import "dotenv/config";
import { createPublicClient, createWalletClient, http, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  AGENT_NAMES,
  ERC8004_ADDRESSES,
  IDENTITY_REGISTRY_ABI,
} from "@noepinax/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configDir = join(__dirname, "..", "packages", "agent", "src", "config");

const jwt = process.env.PINATA_JWT;
if (!jwt) throw new Error("PINATA_JWT required");

async function pinJson(data: unknown): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pinataContent: data }),
  });
  if (!res.ok) throw new Error(`Pinata upload failed: ${res.status}`);
  const { IpfsHash } = await res.json();
  return IpfsHash;
}

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org"),
});

async function registerOne(name: string) {
  const envKey = `AGENT_${name.toUpperCase()}_PRIVATE_KEY`;
  const pk = process.env[envKey] as `0x${string}`;
  if (!pk) {
    console.log(`skipping ${name} - no key`);
    return;
  }

  const account = privateKeyToAccount(pk);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org"),
  });

  const configFile = name === "noepinax" ? "artist.json" : `${name}.json`;
  const config = JSON.parse(readFileSync(join(configDir, configFile), "utf-8"));

  const capabilities =
    config.role === "artist"
      ? ["observe_market", "reason_venice", "generate_art", "mint_erc721", "create_auction"]
      : ["watch_auctions", "evaluate_art", "place_bids"];

  const agentJson = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name,
    description: config.personality,
    image: "",
    services: [
      {
        name: "agent_log",
        endpoint: `https://noepinax.vercel.app/api/logs?agent=${name}`,
        version: "0.1.0",
      },
    ],
    active: true,
    supportedTrust: ["reputation"],
    capabilities,
    wallet: account.address,
  };

  console.log(`pinning ${name} agent.json...`);
  const cid = await pinJson(agentJson);
  const agentUri = `ipfs://${cid}`;
  console.log(`  uri: ${agentUri}`);

  console.log(`registering ${name} on Base mainnet...`);
  const txHash = await walletClient.writeContract({
    address: ERC8004_ADDRESSES.identityRegistry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [agentUri],
  });

  console.log(`  tx: ${txHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  const events = parseEventLogs({
    abi: IDENTITY_REGISTRY_ABI,
    logs: receipt.logs,
    eventName: "Registered",
  });

  const agentId = events[0]?.args?.agentId?.toString() ?? "unknown";
  console.log(`  ${name} registered as agentId #${agentId}\n`);
  return { name, agentId, txHash, agentUri };
}

async function main() {
  console.log("ERC-8004 Identity Registration on Base Mainnet\n");

  // check balances first
  for (const name of AGENT_NAMES) {
    const pk = process.env[`AGENT_${name.toUpperCase()}_PRIVATE_KEY`] as `0x${string}`;
    if (!pk) continue;
    const addr = privateKeyToAccount(pk).address;
    const bal = await publicClient.getBalance({ address: addr });
    const ethBal = Number(bal) / 1e18;
    console.log(`${name}: ${addr} (${ethBal.toFixed(6)} ETH)`);
    if (ethBal < 0.0005) {
      console.log(`  WARNING: low balance, registration may fail`);
    }
  }
  console.log();

  const results = [];
  for (const name of AGENT_NAMES) {
    try {
      const r = await registerOne(name);
      if (r) results.push(r);
    } catch (err) {
      console.error(`failed to register ${name}:`, err);
    }
  }

  console.log("\n--- Summary ---");
  for (const r of results) {
    console.log(`${r.name}: agentId #${r.agentId} | ${r.agentUri}`);
  }
}

main().catch(console.error);
