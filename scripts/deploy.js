const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const hre = require("hardhat");

function logoHash() {
  const logoPath = path.join(__dirname, "..", "alu-logo.png");
  if (!fs.existsSync(logoPath)) {
    throw new Error(
      "alu-logo.png is missing. Add the official ALU logo before deploying."
    );
  }

  return `0x${crypto.createHash("sha256").update(fs.readFileSync(logoPath)).digest("hex")}`;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const contentHash = logoHash();

  const Registry = await hre.ethers.getContractFactory("ALUAssetRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const registration = await registry.registerAsset(
    "ALU Official Logo",
    "png",
    contentHash
  );
  await registration.wait();

  const Token = await hre.ethers.getContractFactory("ALULogoToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();

  const deployment = {
    registryAddress: await registry.getAddress(),
    tokenAddress: await token.getAddress(),
    network: { chainId: "0x7a69", name: "Hardhat Local" }
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "frontend", "deployment.json"),
    `${JSON.stringify(deployment, null, 2)}\n`
  );

  console.log(`ALUAssetRegistry deployed to: ${deployment.registryAddress}`);
  console.log(`ALULogoToken deployed to: ${deployment.tokenAddress}`);
  console.log(`Registered logo SHA-256: ${contentHash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
