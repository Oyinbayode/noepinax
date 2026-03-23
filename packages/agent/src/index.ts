import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { AgentConfig } from "@noepinax/shared";
import { AGENT_NAMES } from "@noepinax/shared";
import { WalletManager } from "./wallet/manager.js";
import { VeniceClient } from "./venice/client.js";
import { AgentLogger } from "./logging/agent-log.js";
import { AgentLoop } from "./core/loop.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const agentName = process.env.AGENT_NAME;

if (!agentName || !AGENT_NAMES.includes(agentName as any)) {
  console.error(`AGENT_NAME must be one of: ${AGENT_NAMES.join(", ")}`);
  process.exit(1);
}

const veniceKey = process.env.VENICE_API_KEY;
if (!veniceKey) {
  console.error("VENICE_API_KEY is required");
  process.exit(1);
}

const configName = agentName === "noepinax" ? "artist" : agentName;
const configPath = join(__dirname, "config", `${configName}.json`);
const config: AgentConfig = JSON.parse(readFileSync(configPath, "utf-8"));

const privateKeyEnv = `AGENT_${agentName.toUpperCase()}_PRIVATE_KEY`;
const privateKey = process.env[privateKeyEnv] as `0x${string}`;
if (!privateKey) {
  console.error(`${privateKeyEnv} is required`);
  process.exit(1);
}

const wallet = new WalletManager(privateKey, config.daily_gas_limit);
const venice = new VeniceClient(veniceKey);
const logger = new AgentLogger(agentName);

const loop = new AgentLoop(config, wallet, venice, logger);

process.on("SIGINT", () => {
  loop.stop();
  logger.flush();
  process.exit(0);
});

process.on("SIGTERM", () => {
  loop.stop();
  logger.flush();
  process.exit(0);
});

console.log(`[${agentName}] address: ${wallet.address}`);
loop.start();
