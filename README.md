# WhereIsMyPhoto

**Face-scan → reverse-image search → face-embedding verification → Merkle attestation on-chain → re-verification.**

Built for HH Goa 2026 Shortlisting Task 3.

---

## Architecture

```
            ┌─────────────────────────────────────────────────────────────────┐
            │                        INPUT IMAGE                              │
            └───────────────────────────┬─────────────────────────────────────┘
                                        │
                    ┌───────────────────▼─────────────────────┐
                    │         PHASE 1 — Face Detection         │
                    │   @vladmandic/face-api + TF.js WASM      │
                    │   → 128-D descriptor · bounding box       │
                    │   → Laplacian variance sharpness          │
                    │   → dHash · SHA-256                       │
                    └───────────────────┬─────────────────────┘
                                        │ face crop
                    ┌───────────────────▼─────────────────────┐
                    │      PHASE 2 — Reverse Image Search      │
                    │   Full image + face crop → Litterbox     │
                    │   (1-hour temporary CDN, auto-expires)    │
                    │   → Google Lens (Serper) × 2 queries      │
                    │   → Merge + deduplicate results           │
                    └───────────────────┬─────────────────────┘
                                        │ candidate URLs
                    ┌───────────────────▼─────────────────────┐
                    │    PHASE 2 — Embedding Verification      │
                    │  Fetch each candidate image (5s timeout) │
                    │  Run face detection + 128-D descriptor    │
                    │  Euclidean distance to input face         │
                    │  ≤0.50 = verified · 0.50–0.60 = probable │
                    │  Sort verified first, display real %      │
                    └───────────────────┬─────────────────────┘
                                        │ best verified match
                    ┌───────────────────▼─────────────────────┐
                    │      PHASE 3 — Merkle Tree Building      │
                    │  6 leaves (keccak256 per field):          │
                    │  imageSha256 · faceDescHash · postUrl     │
                    │  postImageSha256 · similarity · timestamp │
                    │  Sorted-pair hashing (tamper-evident)     │
                    │  recordId = keccak256(canonical JSON)     │
                    └───────────────────┬─────────────────────┘
                                        │ merkleRoot + recordId
                    ┌───────────────────▼─────────────────────┐
                    │  PHASE 3 — On-chain Attestation          │
                    │  AttestationRegistry.attest(id, root)    │
                    │  Write-once (reverts on duplicate)        │
                    │  + EIP-712 signed by attesting wallet     │
                    └───────────────────┬─────────────────────┘
                                        │ txHash
                    ┌───────────────────▼─────────────────────┐
                    │  PHASE 3 — On-chain Re-verification      │
                    │  Recompute root from record fields        │
                    │  getAttestation(recordId) from chain      │
                    │  Compare roots + recover EIP-712 signer   │
                    │  PASS / FAIL printed with both roots      │
                    └─────────────────────────────────────────┘
```

---

## Quick Start (localhost demo)

### Prerequisites
- Node.js 18+ (tested on Node 22)
- npm 9+

### 1 — Install dependencies

```bash
# Root Next.js project
npm install

# Hardhat blockchain project (separate package, keeps Next.js build clean)
cd chain && npm install && cd ..
```

No model download needed — face-api model weights (~3 MB) are bundled inside
`node_modules/@vladmandic/face-api/model/` after `npm install`.

### 2 — Environment variables

```bash
cp .env.example .env
# Edit .env and set SERPER_API_KEY (pipeline also works in --offline mode)
```

### 3 — Run the end-to-end pipeline

**Terminal 1** — local blockchain node:
```bash
cd chain && npx hardhat node
```

**Terminal 2** — full pipeline:
```bash
# Live Serper Lens search (requires SERPER_API_KEY in .env):
npm run pipeline -- --image ./samples/sample_face.jpg

# Offline / no API key (uses canned fixtures from ./fixtures/):
npm run pipeline -- --image ./samples/sample_face.jpg --offline
```

The pipeline automatically:
1. Detects faces and computes real diagnostics
2. Uploads to Litterbox (1-hour temp hosting) and queries Serper Lens twice
3. Fetches candidate images and verifies with face embeddings
4. Builds the 6-leaf Merkle tree
5. Auto-deploys the contract if needed, then attests on-chain
6. Immediately re-verifies and prints **PASS**

### 4 — Tamper demo

```bash
# After attesting, grab the most recent record file:
RECORD=$(ls attestations/*.json | head -1)

cd chain

# Should PASS:
RECORD_PATH="../$RECORD" npx hardhat run scripts/verify.ts --network localhost

# Mutates similarityScore in memory — should FAIL:
TAMPER=1 RECORD_PATH="../$RECORD" npx hardhat run scripts/verify.ts --network localhost
```

### 5 — Web UI

```bash
npm run dev   # → http://localhost:3000
```

Upload a face photo — the UI runs the scan pipeline and shows:
- Real face detection + diagnostics (bounding box, sharpness, dHash, SHA-256)
- Reverse-image search results with verification badges (face-verified / probable / visual-only)
- Blockchain Attestation panel with real Merkle root, EIP-712 signature, and tx hash

> **First request is slow (~10 s)** due to TF.js WASM model loading. Subsequent requests are ~0.5–2 s.

---

## Running on Polygon Amoy testnet

```bash
npm run pipeline -- --image ./samples/me.jpg --network amoy
```

Requires `PRIVATE_KEY` and optionally `AMOY_RPC_URL` in `.env`. If `PRIVATE_KEY` is unset the
pipeline errors with clear instructions.

---

## Smart Contract

`chain/contracts/AttestationRegistry.sol` — Solidity ^0.8.24

```solidity
// Write-once, tamper-evident record
function attest(bytes32 recordId, bytes32 merkleRoot) external;
// Reverts if recordId already attested

// Read attestation
function getAttestation(bytes32 recordId) external view
  returns (bytes32 merkleRoot, address attester, uint64 timestamp);

event Attested(bytes32 indexed recordId, bytes32 merkleRoot, address attester, uint256 timestamp);
```

Run tests:
```bash
cd chain && npx hardhat test   # 6 tests, all pass
```

---

## Offline / Fixtures Mode

The pipeline automatically uses `fixtures/lens_response.json` when `SERPER_API_KEY` is unset or
`--offline` is passed. After the first live run, the real Serper response is saved to
`fixtures/` automatically — so subsequent runs don't need network access.

---

## Technical notes

- **Face detection:** @vladmandic/face-api with TF.js WASM backend (no native bindings).
  Images are resized to ≤480px, converted to RGB Tensor3D, fed to SSD MobileNetV1.
  Descriptors are 128-D float32 vectors; Euclidean distance < 0.5 = same face.

- **Merkle tree:** 6 leaves — one keccak256 per canonical field (`field:value`).
  Sorted-pair hashing at each level. Proofs are stored so any single field can be verified later.

- **Litterbox:** `https://litterbox.catbox.moe/resources/internals/api.php` with `time=1h`.
  Images auto-expire in 1 hour. Fallback to `freeimage.host` if Litterbox is unavailable.

- **EIP-712:** The attesting wallet signs `{imageSha256, faceDescriptorHash, postUrl, merkleRoot, timestampIso}`.
  `verify.ts` recovers the signer and compares to the on-chain `attester` address.

---

## Known Limitations

- Reverse image search can only find photos that are **publicly indexed**.
  The demo uses a photo that already appears on public web pages.
- Lens rate limits: Serper free tier is ~100 searches/month (2 searches per pipeline run).
- Candidate verification **skips images that cannot be fetched** (5-second timeout, 4xx/5xx, private content).
- Face detection requires a clear, frontal, well-lit portrait. Profile shots or heavy compression may not detect.
- TF.js WASM backend — pure WebAssembly, no GPU acceleration. First inference ~0.8 s, adequate for demo.

---

## Ethics

This tool is designed for **auditing your own likeness** or images of consenting subjects.
Do not use it to track individuals without their consent.
See [/terms](/terms) and [/privacy](/privacy).

---

## BEFORE SUBMISSION

- [ ] **Rotate the Serper API key.** The key in `.env` was used during development. Get a fresh one at https://serper.dev and update `.env`. Do not commit `.env`.
- [ ] **Create a throwaway Ethereum wallet.** Use `cast wallet new` (Foundry) or MetaMask > export private key. Set `PRIVATE_KEY=0x...` in `.env`. Never commit a real private key.
- [ ] **Get Amoy faucet POL.** Visit https://faucet.polygon.technology with your new wallet address. Claim POL for Amoy (chainId 80002).
- [ ] **Deploy to Amoy:**
  ```bash
  cd chain && npx hardhat run scripts/deploy.ts --network amoy
  ```
- [ ] **Re-run the full pipeline on Amoy:**
  ```bash
  npm run pipeline -- --image ./samples/me.jpg --network amoy
  ```
  Confirm the PolygonScan link is printed and the explorer shows the tx.
- [ ] **Put your own publicly-posted photo** in `samples/me.jpg` for the screen recording.
- [ ] **Record the screen demo:**
  - `npm run pipeline` → full run → PASS
  - `verify.ts --tamper` → FAIL
- [ ] **Grep for secrets before pushing:**
  ```bash
  grep -rn "634c23f\|PRIVATE_KEY=0x[a-f0-9]" src/ chain/ scripts/ || echo "clean"
  ```
