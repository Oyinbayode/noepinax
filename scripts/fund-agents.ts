import "dotenv/config";
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { AGENT_NAMES } from "@noepinax/shared";

const rpc = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpc) });

const senderPk = process.env.AGENT_NOEPINAX_PRIVATE_KEY as `0x${string}`;
const sender = privateKeyToAccount(senderPk);
const wallet = createWalletClient({ account: sender, chain: baseSepolia, transport: http(rpc) });

const amountPerCollector = parseEther("0.025");

async function main() {
  const senderBal = await publicClient.getBalance({ address: sender.address });
  console.log(`sender (noepinax): ${formatEther(senderBal)} ETH\n`);

  const collectors = AGENT_NAMES.filter((n) => n !== "noepinax");

  for (const name of collectors) {
    const pk = process.env[`AGENT_${name.toUpperCase()}_PRIVATE_KEY`] as `0x${string}`;
    if (!pk) continue;
    const addr = privateKeyToAccount(pk).address;

    const bal = await publicClient.getBalance({ address: addr });
    if (bal >= amountPerCollector) {
      console.log(`${name}: already has ${formatEther(bal)} ETH, skipping`);
      continue;
    }

    console.log(`funding ${name} (${addr}) with ${formatEther(amountPerCollector)} ETH...`);
    const tx = await wallet.sendTransaction({ to: addr, value: amountPerCollector });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`  tx: ${tx}`);
  }

  console.log("\nfinal balances:");
  for (const name of AGENT_NAMES) {
    const pk = process.env[`AGENT_${name.toUpperCase()}_PRIVATE_KEY`] as `0x${string}`;
    if (!pk) continue;
    const addr = privateKeyToAccount(pk).address;
    const bal = await publicClient.getBalance({ address: addr });
    console.log(`  ${name}: ${formatEther(bal)} ETH`);
  }
}

main().catch(console.error);
