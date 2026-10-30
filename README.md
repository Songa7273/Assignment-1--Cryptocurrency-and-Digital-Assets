# ALU Logo Blockchain Project

This project registers the official ALU logo as a unique ERC-721 asset and
issues ERC-20 `ALUT` tokens representing divisible ownership shares. The
registry preserves the logo metadata and SHA-256 fingerprint, while the token
contract distributes the fixed supply of shares to stakeholders.

## Requirements

- Node.js 18 or newer
- Hardhat 2.22
- Solidity 0.8.24
- The official ALU logo saved as `alu-logo.png` in the project root

The logo file is intentionally not fabricated by this project. Place the
official file supplied by ALU at that path before deploying, then calculate its
hash with:

```powershell
Get-FileHash .\alu-logo.png -Algorithm SHA256
```

The supplied logo has this SHA-256 hash:

```text
13598CE30186D34BA5A05A1975FACBC89084D6014F41604BA60AC261F83939C3
```

The deployment script calculates the same hash directly from the file and
stores it on-chain.

## Install and test

```powershell
npm install
npx hardhat compile
npm test
```

## Run a local deployment

In one terminal:

```powershell
npx hardhat node
```

In another terminal, after adding `alu-logo.png`:

```powershell
npm run deploy
```

The deployment script deploys `ALUAssetRegistry`, registers the logo, deploys
`ALULogoToken`, and prints both contract addresses and the registered hash.

## Contract behavior

`ALUAssetRegistry` uses ERC-721 because the logo registration is one unique
asset. `ALULogoToken` uses ERC-20 because its 1,000,000-token supply is
interchangeable and divisible. Token amounts use 18 decimal places, as is
standard for ERC-20 tokens; `100,000` whole tokens are represented in code as
`100000 * 10 ** 18`.

## Development note

The project uses OpenZeppelin contracts for the ERC-721, ERC-20, and ownership
security primitives. The deploy script fails clearly if the required logo file
is missing rather than registering a placeholder hash.
