// Cloud Run entrypoint for the API container.
//
// Used to also spawn the 6 agent processes in the same container, but Cloud
// Run throttles CPU outside of request handling, which silently paused the
// agents. Agents now run on a dedicated GCE host (see scripts/start-agents.mjs).
// This entrypoint is now a thin wrapper that just runs the API and exits the
// container if it dies, so Cloud Run restarts cleanly.

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const apiPort = process.env.PORT || process.env.API_PORT || "8080";

const child = spawn("node", ["packages/api/dist/server.js"], {
  cwd: root,
  env: { ...process.env, API_PORT: apiPort },
  stdio: "inherit",
});

function shutdown() {
  child.kill("SIGTERM");
  setTimeout(() => process.exit(0), 3000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

child.on("exit", (code) => {
  console.error(`[start] API exited (${code}) — container will restart`);
  process.exit(code ?? 1);
});
