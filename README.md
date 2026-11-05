# ALU Logo Blockchain dApp

This project registers the official ALU logo as a unique ERC-721 asset, issues
ERC-20 `ALUT` ownership shares, and provides a browser dApp for interacting
with both contracts. The frontend supports wallet connection, in-browser
SHA-256 hashing, public logo verification, asset registration, and owner-only
share distribution.

## Requirements

- Node.js 18 or newer
- Hardhat 2.22
- Solidity 0.8.24
- The official ALU logo saved as `alu-logo.png` in the project root
- MetaMask or another EIP-1193-compatible browser wallet for transactions

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

## Run the dApp locally

In one terminal:

```powershell
npx hardhat node
```

In another terminal, after adding `alu-logo.png`:

```powershell
npm run deploy
```

The deployment script deploys `ALUAssetRegistry`, registers the logo, deploys
`ALULogoToken`, prints both contract addresses and the registered hash, and
writes the addresses to `frontend/deployment.json`.

In a third terminal:

```powershell
npm run frontend
```

Open `http://localhost:3000`. Configure MetaMask for the Hardhat network:

- Network URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

Import one of the private keys printed by `npx hardhat node` if you need a
local account with test ETH. The public verification page uses read-only
contract calls and does not require a wallet. Registration and distribution
require a connected wallet; distribution is visible only to the token owner.

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

## Frontend architecture

The frontend is a React application built with Vite. It uses ethers.js to
create read-only and wallet-connected contract instances from the deployed
addresses and ABI fragments in `frontend/src/main.jsx`.
The Web Crypto API computes SHA-256 locally, so the selected image is never
uploaded to a server. `verifyLogoIntegrity()` is a read-only call and costs no
gas; registration and distribution are signed transactions.

The deployed logo hash is:

```text
13598CE30186D34BA5A05A1975FACBC89084D6014F41604BA60AC261F83939C3
```

## Tests

Run all thirteen contract and frontend-integration tests with:

```powershell
npm test
```

The frontend integration checks cover total supply reads, SHA-256 bytes32
formatting, authentic and modified-logo verification, and share distribution.

The React frontend source is in `frontend/src/main.jsx`; Vite serves it during
development and provides the browser module bundling required by React.

## Known limitations

This submission targets the local Hardhat network. A public deployment needs
network-specific addresses, an RPC endpoint, and a production frontend host.
The dashboard shows three deterministic example addresses as required by the
assignment; production deployments should replace these with configured
stakeholder addresses.
