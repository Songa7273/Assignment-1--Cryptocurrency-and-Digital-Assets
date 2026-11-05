import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserProvider, Contract, JsonRpcProvider, formatUnits, isAddress, parseUnits } from "ethers";
import "../styles.css";

const REGISTRY_ABI = [
  "function registerAsset(string assetName,string fileType,bytes32 contentHash) returns (uint256)",
  "function verifyLogoIntegrity(uint256 tokenId,bytes32 suppliedHash) view returns (bool,string)",
  "function getAsset(uint256 tokenId) view returns (string assetName,string fileType,bytes32 contentHash,address registrant,uint256 registeredAt)"
];
const TOKEN_ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function ownershipPercentage(address) view returns (uint256)",
  "function owner() view returns (address)",
  "function distributeShares(address recipient,uint256 amount)"
];
const EXAMPLE_HOLDERS = [
  "0x0000000000000000000000000000000000000001",
  "0x0000000000000000000000000000000000000002",
  "0x0000000000000000000000000000000000000003"
];

const shortAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;
const validHash = (value) => /^0x[0-9a-f]{64}$/i.test(value);
const hashFile = async (file) => {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return `0x${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};
const errorMessage = (error) => error?.reason || error?.shortMessage || error?.message || "The request failed.";

function App() {
  const [config, setConfig] = useState(null);
  const [contracts, setContracts] = useState(null);
  const [wallet, setWallet] = useState("");
  const [notice, setNotice] = useState(null);
  const [verification, setVerification] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [dashboard, setDashboard] = useState({ total: "-", balance: "Connect wallet", percentage: "-", examples: [] });
  const [owner, setOwner] = useState(false);
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyPreview, setVerifyPreview] = useState("");
  const [registerHash, setRegisterHash] = useState("");
  const [registerPreview, setRegisterPreview] = useState("");
  const [assetName, setAssetName] = useState("");
  const [fileType, setFileType] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [distribution, setDistribution] = useState(null);

  const readContracts = async (addresses) => {
    const provider = new JsonRpcProvider("http://127.0.0.1:8545");
    const next = {
      registry: new Contract(addresses.registryAddress, REGISTRY_ABI, provider),
      token: new Contract(addresses.tokenAddress, TOKEN_ABI, provider)
    };
    setContracts(next);
    return next;
  };

  const refreshDashboard = async (nextContracts = contracts, address = wallet) => {
    if (!nextContracts?.token) return;
    try {
      const { token } = nextContracts;
      const examples = await Promise.all(EXAMPLE_HOLDERS.map(async (holder) => ({
        address: holder,
        percentage: await token.ownershipPercentage(holder)
      })));
      const nextDashboard = {
        total: `${formatUnits(await token.totalSupply(), 18)} ALUT`,
        balance: address ? `${formatUnits(await token.balanceOf(address), 18)} ALUT` : "Connect wallet",
        percentage: address ? `${await token.ownershipPercentage(address)}%` : "-",
        examples
      };
      setDashboard(nextDashboard);
      if (address) setOwner((await token.owner()).toLowerCase() === address.toLowerCase());
    } catch (error) {
      setNotice({ message: errorMessage(error), error: true });
    }
  };

  useEffect(() => {
    fetch("./deployment.json")
      .then(async (response) => {
        if (!response.ok) throw new Error("Deployment addresses are not configured. Run the Hardhat deployment first.");
        const addresses = await response.json();
        setConfig(addresses);
        const nextContracts = await readContracts(addresses);
        await refreshDashboard(nextContracts);
      })
      .catch((error) => setNotice({ message: errorMessage(error), error: true }));
  }, []);

  useEffect(() => {
    if (!window.ethereum) return undefined;
    const changed = () => window.location.reload();
    window.ethereum.on("accountsChanged", changed);
    return () => window.ethereum.removeListener("accountsChanged", changed);
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) return setNotice({ message: "No Web3 wallet detected. Install MetaMask or another compatible wallet.", error: true });
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const next = {
        registry: new Contract(config.registryAddress, REGISTRY_ABI, signer),
        token: new Contract(config.tokenAddress, TOKEN_ABI, signer)
      };
      setWallet(address);
      setContracts(next);
      await refreshDashboard(next, address);
      setNotice({ message: "Wallet connected.", error: false });
    } catch (error) {
      setNotice({ message: errorMessage(error), error: true });
    }
  };

  const selectFile = async (file, setHash, setPreview, setType) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setHash(await hashFile(file));
    if (setType && !fileType) setType(file.type.split("/")[1]?.toUpperCase() || "");
  };

  const verify = async () => {
    if (!contracts?.registry) return setNotice({ message: "Deploy the contracts and refresh the page before verifying.", error: true });
    if (!validHash(verifyHash)) return setVerification({ message: "Please upload an image or enter a valid SHA-256 hash.", success: false });
    try {
      const [authentic] = await contracts.registry.verifyLogoIntegrity(1, verifyHash);
      if (!authentic) return setVerification({ message: "Warning: This logo has been modified.", success: false });
      const asset = await contracts.registry.getAsset(1);
      setVerification({ message: `Logo Verified: This is the authentic ALU logo. Registered as ${asset.assetName} (${asset.fileType}).`, success: true });
    } catch (error) {
      setVerification({ message: errorMessage(error), success: false });
    }
  };

  const register = async () => {
    if (!wallet) return setNotice({ message: "Connect your wallet before registering an asset.", error: true });
    if (!validHash(registerHash) || !assetName || !fileType) return setRegistration({ message: "Select a file and complete all registration fields.", success: false });
    try {
      const transaction = await contracts.registry.registerAsset(assetName, fileType, registerHash);
      const receipt = await transaction.wait();
      const event = receipt.logs.map((log) => {
        try { return contracts.registry.interface.parseLog(log); } catch { return null; }
      }).find((parsed) => parsed?.name === "AssetRegistered");
      setRegistration({ message: `Asset registered successfully. Token ID: ${event?.args?.tokenId ?? "1"}.`, success: true });
    } catch (error) {
      setRegistration({ message: errorMessage(error), success: false });
    }
  };

  const distribute = async () => {
    try {
      if (!isAddress(recipient) || Number(amount) <= 0) throw new Error("Enter a valid recipient and an amount greater than zero.");
      const rawAmount = parseUnits(amount, 18);
      if (rawAmount > await contracts.token.balanceOf(wallet)) throw new Error("The owner does not have enough ALUT.");
      const transaction = await contracts.token.distributeShares(recipient, rawAmount);
      await transaction.wait();
      setDistribution({ message: "Shares distributed successfully.", success: true });
      await refreshDashboard(contracts, wallet);
    } catch (error) {
      setDistribution({ message: errorMessage(error), success: false });
    }
  };

  const result = (value) => value && <div className={`result ${value.success ? "success" : "failure"}`}>{value.message}</div>;
  return (
    <>
      <header className="topbar">
        <a className="brand" href="#verify">ALU Digital Asset Portal</a>
        <div className="wallet-area">
          <span className="muted">{wallet ? "Wallet connected" : "Read-only mode"}</span>
          {wallet && <span className="wallet-address">{shortAddress(wallet)}</span>}
          <button className="button primary" onClick={connectWallet}>Connect Wallet</button>
        </div>
      </header>
      <main>
        <section className="hero"><p className="eyebrow">Blockchain-backed authenticity</p><h1>Protect the ALU identity.</h1><p>Verify the official logo, register new assets, and manage ALUT ownership from one simple interface.</p></section>
        {notice && <div className={`notice${notice.error ? " error" : ""}`}>{notice.message}</div>}
        <section className="grid">
          <article className="card" id="verify">
            <div className="card-heading"><div><p className="eyebrow">Public verification</p><h2>Is this the authentic ALU logo?</h2></div><span className="badge">No wallet required</span></div>
            <label htmlFor="verify-file">Upload a logo image</label><input id="verify-file" type="file" accept="image/*" onChange={(event) => selectFile(event.target.files[0], setVerifyHash, setVerifyPreview)} />
            {verifyPreview && <img className="preview" src={verifyPreview} alt="Selected logo preview" />}<p className="or">or paste a SHA-256 hash</p>
            <input value={verifyHash} onChange={(event) => setVerifyHash(event.target.value)} placeholder="64 hexadecimal characters" />
            <button className="button primary" onClick={verify}>Verify logo</button>{result(verification)}
          </article>
          <article className="card">
            <p className="eyebrow">Asset registration</p><h2>Register a logo asset</h2><p className="muted">Connect a wallet to register a new, uniquely fingerprinted asset.</p>
            <label htmlFor="register-file">Logo file</label><input id="register-file" type="file" accept="image/*" onChange={(event) => selectFile(event.target.files[0], setRegisterHash, setRegisterPreview, setFileType)} />
            {registerPreview && <img className="preview" src={registerPreview} alt="Selected logo preview" />}
            <label htmlFor="asset-name">Asset name</label><input id="asset-name" value={assetName} onChange={(event) => setAssetName(event.target.value)} placeholder="ALU Official Logo 2026" />
            <label htmlFor="file-type">File type</label><input id="file-type" value={fileType} onChange={(event) => setFileType(event.target.value)} placeholder="PNG" />
            <label htmlFor="content-hash">Content hash</label><input id="content-hash" value={registerHash} readOnly placeholder="Select a file" />
            <button className="button primary" onClick={register}>Register asset</button>{result(registration)}
          </article>
        </section>
        <section className="card dashboard">
          <div className="card-heading"><div><p className="eyebrow">ALUT ownership</p><h2>Token distribution dashboard</h2></div><button className="button secondary" onClick={() => refreshDashboard()}>Refresh</button></div>
          <div className="stats"><div><span>Total supply</span><strong>{dashboard.total}</strong></div><div><span>Your balance</span><strong>{dashboard.balance}</strong></div><div><span>Your ownership</span><strong>{dashboard.percentage}</strong></div></div>
          <h3>Example ownership</h3><div className="holders">{dashboard.examples.map((holder) => <div className="holder" key={holder.address}><span>{shortAddress(holder.address)}</span><strong>{holder.percentage}%</strong></div>)}</div>
          {owner && <div><h3>Owner distribution</h3><p className="muted">Only the ALUT contract owner can distribute shares.</p><div className="form-row"><input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Recipient wallet address" /><input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0" step="any" placeholder="Amount of ALUT" /><button className="button primary" onClick={distribute}>Distribute</button></div>{result(distribution)}</div>}
        </section>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
