import { parseEventLogs } from "viem";
import { ERC8004_ADDRESSES, IDENTITY_REGISTRY_ABI } from "@noepinax/shared";
import type { AgentIdentity } from "@noepinax/shared";
import type { WalletManager } from "../wallet/manager.js";

const PINATA_API = "https://api.pinata.cloud";

async function pinJson(jwt: string, data: unknown): Promise<string> {
  const res = await fetch(`${PINATA_API}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pinataContent: data }),
  });
  if (!res.ok) throw new Error(`Pinata upload failed: ${res.status}`);
  const json = await res.json() as { IpfsHash: string };
  return json.IpfsHash;
}

export async function registerAgent(
  wallet: WalletManager,
  identity: AgentIdentity,
): Promise<{ agentId: string; txHash: string }> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT required for ERC-8004 registration");

  const agentJson = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: identity.name,
    description: `${identity.role} agent in the Noepinax autonomous art economy`,
    image: "",
    active: true,
    supportedTrust: ["reputation"],
    capabilities: identity.capabilities,
    services: identity.service_endpoints.map((s) => ({
      name: s.type,
      endpoint: s.url,
      version: "0.1.0",
    })),
    wallet: identity.wallet_address,
    operator: identity.operator_address,
  };

  const cid = await pinJson(jwt, agentJson);
  const agentUri = `ipfs://${cid}`;

  const txHash = await wallet.mainnetWallet.writeContract({
    address: ERC8004_ADDRESSES.identityRegistry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [agentUri],
  });

  const receipt = await wallet.mainnetPublic.waitForTransactionReceipt({ hash: txHash });

  const events = parseEventLogs({
    abi: IDENTITY_REGISTRY_ABI,
    logs: receipt.logs,
    eventName: "Registered",
  });

  const agentId = events[0]?.args?.agentId?.toString() ?? "unknown";

  return { agentId, txHash };
}

export async function fetchAgentUri(
  wallet: WalletManager,
  agentId: bigint,
): Promise<string> {
  const uri = await wallet.mainnetPublic.readContract({
    address: ERC8004_ADDRESSES.identityRegistry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "tokenURI",
    args: [agentId],
  });
  return uri as string;
}
