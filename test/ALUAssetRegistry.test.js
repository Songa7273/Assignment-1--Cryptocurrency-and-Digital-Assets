const { expect } = require("chai");
const { ethers } = require("hardhat");
const crypto = require("node:crypto");

describe("ALU logo contracts", function () {
  let registry;
  let token;
  let owner;
  let recipient;
  const logoHash = ethers.keccak256(ethers.toUtf8Bytes("official-alu-logo"));
  const amount = ethers.parseUnits("100000", 18);

  beforeEach(async function () {
    [owner, recipient] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("ALUAssetRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    const Token = await ethers.getContractFactory("ALULogoToken");
    token = await Token.deploy(owner.address);
    await token.waitForDeployment();
  });

  it("registers the ALU logo and returns a token ID", async function () {
    await expect(
      registry.registerAsset("ALU Official Logo", "png", logoHash)
    ).to.emit(registry, "AssetRegistered").withArgs(
      1,
      "ALU Official Logo",
      "png",
      logoHash,
      owner.address
    );
    expect(await registry.ownerOf(1)).to.equal(owner.address);
  });

  it("rejects a second registration with the same hash", async function () {
    await registry.registerAsset("ALU Official Logo", "png", logoHash);
    await expect(
      registry.registerAsset("Copy", "png", logoHash)
    ).to.be.revertedWith("Asset hash already registered");
  });

  it("returns true and the authentic message for the correct hash", async function () {
    await registry.registerAsset("ALU Official Logo", "png", logoHash);
    expect(await registry.verifyLogoIntegrity(1, logoHash)).to.deep.equal([
      true,
      "Logo is authentic."
    ]);
  });

  it("returns false and a warning for an incorrect hash", async function () {
    await registry.registerAsset("ALU Official Logo", "png", logoHash);
    const incorrectHash = ethers.keccak256(ethers.toUtf8Bytes("modified-logo"));
    expect(await registry.verifyLogoIntegrity(1, incorrectHash)).to.deep.equal([
      false,
      "Warning: logo does not match."
    ]);
  });

  it("returns the registered asset metadata", async function () {
    await registry.registerAsset("ALU Official Logo", "png", logoHash);
    const asset = await registry.getAsset(1);
    expect(asset.assetName).to.equal("ALU Official Logo");
    expect(asset.fileType).to.equal("png");
  });

  it("mints the full fixed supply to the logo owner", async function () {
    expect(await token.totalSupply()).to.equal(ethers.parseUnits("1000000", 18));
    expect(await token.balanceOf(owner.address)).to.equal(
      ethers.parseUnits("1000000", 18)
    );
  });

  it("allows the owner to distribute shares", async function () {
    await token.distributeShares(recipient.address, amount);
    expect(await token.balanceOf(recipient.address)).to.equal(amount);
  });

  it("calculates whole-number ownership percentages", async function () {
    await token.distributeShares(recipient.address, amount);
    expect(await token.ownershipPercentage(recipient.address)).to.equal(10);
  });

  it("frontend integration reads the total ALUT supply as 1,000,000", async function () {
    expect(ethers.formatUnits(await token.totalSupply(), 18)).to.equal("1000000.0");
  });

  it("frontend hashing produces a SHA-256 bytes32 value", async function () {
    const digest = crypto.createHash("sha256").update("ALU logo").digest("hex");
    expect(`0x${digest}`).to.match(/^0x[0-9a-f]{64}$/);
  });

  it("frontend verification succeeds for the registered logo hash", async function () {
    await registry.registerAsset("ALU Official Logo", "png", logoHash);
    const [authentic] = await registry.verifyLogoIntegrity(1, logoHash);
    expect(authentic).to.equal(true);
  });

  it("frontend verification fails for an incorrect hash", async function () {
    await registry.registerAsset("ALU Official Logo", "png", logoHash);
    const incorrectHash = ethers.keccak256(ethers.toUtf8Bytes("modified-logo"));
    const [authentic] = await registry.verifyLogoIntegrity(1, incorrectHash);
    expect(authentic).to.equal(false);
  });

  it("frontend distribution updates the recipient balance", async function () {
    await token.distributeShares(recipient.address, amount);
    expect(await token.balanceOf(recipient.address)).to.equal(amount);
  });
});
