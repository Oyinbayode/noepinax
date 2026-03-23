export const BASE_SEPOLIA = {
  chainId: 84532,
  rpc: "https://sepolia.base.org",
  blockExplorer: "https://sepolia.basescan.org",
} as const;

export const BASE_MAINNET = {
  chainId: 8453,
  rpc: "https://mainnet.base.org",
  blockExplorer: "https://basescan.org",
} as const;

export const ERC8004_ADDRESSES = {
  identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as `0x${string}`,
  reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as `0x${string}`,
} as const;

export const VENICE_API = {
  baseUrl: "https://api.venice.ai/api/v1",
} as const;

export const AGENT_NAMES = [
  "noepinax",
  "temperance",
  "fervor",
  "dusk",
  "contrarian",
  "echo",
] as const;

export type AgentName = (typeof AGENT_NAMES)[number];

export const ART_DIMENSIONS = { width: 2000, height: 2000 } as const;

export const AUCTION_DURATION_SECONDS = 2700; // 45 minutes

export const API_PORT = 3001;

export const IDENTITY_REGISTRY_ABI = [
  {
    inputs: [],
    name: "register",
    outputs: [{ internalType: "uint256", name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "agentURI", type: "string" }],
    name: "register",
    outputs: [{ internalType: "uint256", name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "agentURI", type: "string" },
      {
        components: [
          { internalType: "string", name: "metadataKey", type: "string" },
          { internalType: "bytes", name: "metadataValue", type: "bytes" },
        ],
        internalType: "struct IdentityRegistryUpgradeable.MetadataEntry[]",
        name: "metadata",
        type: "tuple[]",
      },
    ],
    name: "register",
    outputs: [{ internalType: "uint256", name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "agentId", type: "uint256" },
      { internalType: "string", name: "metadataKey", type: "string" },
    ],
    name: "getMetadata",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "agentId", type: "uint256" }],
    name: "getAgentWallet",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "agentId", type: "uint256" },
      { internalType: "string", name: "metadataKey", type: "string" },
      { internalType: "bytes", name: "metadataValue", type: "bytes" },
    ],
    name: "setMetadata",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "agentId", type: "uint256" },
      { internalType: "string", name: "newURI", type: "string" },
    ],
    name: "setAgentURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "agentId", type: "uint256" },
      { indexed: false, internalType: "string", name: "agentURI", type: "string" },
      { indexed: true, internalType: "address", name: "owner", type: "address" },
    ],
    name: "Registered",
    type: "event",
  },
] as const;

export const REPUTATION_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "agentId", type: "uint256" },
      { internalType: "int128", name: "value", type: "int128" },
      { internalType: "uint8", name: "valueDecimals", type: "uint8" },
      { internalType: "string", name: "tag1", type: "string" },
      { internalType: "string", name: "tag2", type: "string" },
      { internalType: "string", name: "endpoint", type: "string" },
      { internalType: "string", name: "feedbackURI", type: "string" },
      { internalType: "bytes32", name: "feedbackHash", type: "bytes32" },
    ],
    name: "giveFeedback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "agentId", type: "uint256" }],
    name: "getClients",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "agentId", type: "uint256" },
      { internalType: "address[]", name: "clientAddresses", type: "address[]" },
      { internalType: "string", name: "tag1", type: "string" },
      { internalType: "string", name: "tag2", type: "string" },
    ],
    name: "getSummary",
    outputs: [
      { internalType: "uint64", name: "count", type: "uint64" },
      { internalType: "int128", name: "summaryValue", type: "int128" },
      { internalType: "uint8", name: "summaryValueDecimals", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
