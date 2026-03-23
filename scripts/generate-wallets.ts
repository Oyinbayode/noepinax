import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const agents = [
  "NOEPINAX",
  "TEMPERANCE",
  "FERVOR",
  "DUSK",
  "CONTRARIAN",
  "ECHO",
];

console.log("# Generated Agent Wallets");
console.log("# Add these to your .env file\n");

for (const name of agents) {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  console.log(`# ${name}`);
  console.log(`AGENT_${name}_PRIVATE_KEY=${privateKey}`);
  console.log(`# Address: ${account.address}\n`);
}
