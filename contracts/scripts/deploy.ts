import "dotenv/config";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const artistAddress = process.env.AGENT_NOEPINAX_PRIVATE_KEY
    ? new ethers.Wallet(process.env.AGENT_NOEPINAX_PRIVATE_KEY).address
    : deployer.address;

  const Art = await ethers.getContractFactory("NoepinaxArt");
  const art = await Art.deploy(artistAddress);
  await art.waitForDeployment();
  const artAddress = await art.getAddress();
  console.log("NoepinaxArt deployed to:", artAddress);

  const Auction = await ethers.getContractFactory("NoepinaxAuction");
  const auction = await Auction.deploy();
  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("NoepinaxAuction deployed to:", auctionAddress);

  const Marketplace = await ethers.getContractFactory("NoepinaxMarketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("NoepinaxMarketplace deployed to:", marketplaceAddress);

  console.log("\nAdd to .env:");
  console.log(`NOEPINAX_ART_ADDRESS=${artAddress}`);
  console.log(`NOEPINAX_AUCTION_ADDRESS=${auctionAddress}`);
  console.log(`NOEPINAX_MARKETPLACE_ADDRESS=${marketplaceAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
