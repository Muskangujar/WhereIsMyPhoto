# WhereIsMyPhoto

WhereIsMyPhoto is an open-source reverse image search engine and cryptographic attestation pipeline designed to discover public web and social media footprints of uploaded photographs.

The system allows users to upload a photo, performs a live visual search across indexed public internet pages (including LinkedIn, X, Instagram, Pinterest, Reddit, blogs, and news platforms), and generates a verifiable, tamper-evident cryptographic attestation payload (SHA-256, perceptual hash, and Merkle root) ready for blockchain testnet recording.

---

## Critical System Principle

This system is an image footprint search engine, not a personal surveillance or person-identification system.

The pipeline searches for occurrences of the uploaded photo, modified copies, or visually similar crops across the public web. It does not maintain a surveillance database of private identities, does not track individuals, and strictly enforces anti-stalking terms of use.

---

## Core Pipeline Architecture

```
[ User Photo Upload ]
         |
         v
[ Cryptographic Hashing ]
   - SHA-256 File Digest
   - Perceptual Hash (pHash)
   - Resolution and Sharpness Screening
         |
         +-------------------------------------+
         |                                     |
         v                                     v
[ Google Lens via Serper API ]      [ Groq Vision & LLM Engine ]
   - Live Public Web Crawl             - Synthetic AI / Deepfake Screening
   - Social Media Profile Discovery    - Footprint Entity Verification
   - Exact and Cropped Match URLs      - Quality and Anomaly Scoring
         |                                     |
         +------------------+------------------+
                            |
                            v
              [ Merkle Root Aggregator ]
                            |
                            v
          [ Blockchain Attestation Payload ]
   - EIP-712 Standard Attestation Object
   - SHA-256 Digest and Merkle Root
   - Discovered Web Match Endpoints
   - 1-Click JSON Export and Testnet Minting
```

---

## Key Features

1. Live Reverse Image Search:
   Queries Google Lens via Serper API to crawl billions of public internet pages and locate matching images on LinkedIn, X, Instagram, Pinterest, Reddit, company directories, and news publications.

2. Edge-Case Diagnostics:
   - Private and Non-Web Persons: Detects photos with zero public exposure, providing a verified zero-footprint attestation.
   - Synthetic AI and Deepfake Screening: Identifies generative AI artifacts and diffusion anomalies.
   - Quality and Sharpness Analysis: Automatically scores image clarity and flags blurry inputs.
   - Image Cropping Resilience: Uses perceptual hashing (pHash) to detect resized, compressed, or cropped editions.

3. Blockchain Verification Handoff:
   Computes a deterministic Merkle Root from the image SHA-256 digest, perceptual hash, and discovered public URLs. Exports a standardized EIP-712 JSON payload ready for integration with EVM smart contracts, Solana programs, or testnet minting.

4. Modern Responsive Interface:
   Built with Next.js (App Router), React, TypeScript, and Tailwind CSS. Features an interactive 3D Cobe Globe in a high-contrast white aesthetic with Cormorant Garamond typography.

5. Ethical Safeguards:
   Dedicated Terms of Service with a strict anti-stalking clause and a Privacy Policy enforcing transient, zero-retention memory processing.

---

## Technology Stack

- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- 3D Visualization: Cobe (Interactive WebGL Globe)
- Reverse Image Search: Serper API (Google Lens)
- AI Analysis: Groq API
- Cryptography: Node.js Crypto (SHA-256, MD5 pHash, Merkle Root)
- Icons: Lucide React

---

## Project Structure

```
face-search-hackathon/
├── .env                          # Root environment configuration
├── .gitignore                    # Git ignore file for Python and Node.js
├── README.md                     # Project documentation
├── requirements.txt              # Optional Python backend dependencies
├── app.py                        # Optional standalone Python script
└── frontend/
    ├── .env.local                # Frontend API keys (Serper, Groq)
    ├── package.json              # Node dependencies
    ├── next.config.ts            # Next.js configuration
    ├── tsconfig.json             # TypeScript configuration
    └── src/
        ├── app/
            ├── layout.tsx        # Typography, SEO metadata, Root Layout
            ├── page.tsx          # Main Search Engine Workspace
            ├── icon.tsx          # Dynamic SVG smile favicon
            ├── globals.css       # Clean monochrome styles
            ├── terms/page.tsx    # Terms of Service and Anti-Stalking Policy
            ├── privacy/page.tsx  # Privacy Policy and Zero-Storage Policy
            ├── not-found.tsx     # Custom 404 Page
            └── api/
                └── scan/
                    └── route.ts  # Live Google Lens, Groq, and Hashing API
        ├── components/
            ├── Navbar.tsx        # Navigation header
            ├── HeroSection.tsx   # Hero with interactive 3D Cobe Globe
            ├── ImageUploader.tsx # Drag and drop image uploader
            ├── EmptyState.tsx    # Initial empty state guide
            ├── ScanDiagnostics.tsx # Edge-case screening metrics
            ├── ResultsView.tsx   # Discovered public matches grid
            ├── BlockchainHandoff.tsx # Merkle tree viewer and JSON export
            ├── ApiSettingsModal.tsx  # API engine selector modal
            └── ui/
                ├── cobe-globe.tsx # 3D WebGL Globe component
                └── demo.tsx       # Standalone globe preview
        ├── lib/
            └── utils.ts          # Tailwind class merger utility
        └── types/
            └── index.ts          # TypeScript interfaces
```

---

## Getting Started

### Prerequisites

- Node.js version 18 or higher (Node 22 recommended)
- npm version 9 or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/face-search-hackathon.git
   cd face-search-hackathon
   ```

2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Configure environment variables in `frontend/.env.local`:
   ```env
   SERPER_API_KEY="your_serper_api_key_here"
   GROQ_API_KEY="your_groq_api_key_here"
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and visit:
   `http://localhost:3000`

---

## API Keys Guide

| Provider | Purpose | Free Tier | Registration Link |
| :--- | :--- | :--- | :--- |
| Serper API | Live Google Lens reverse image lookup | 2,500 free queries on signup | https://serper.dev |
| Groq API | Fast AI verification and footprint analysis | 100% free access | https://console.groq.com |
| Google Cloud Vision | Alternative enterprise web detection | 1,000 free requests per month | https://console.cloud.google.com |

---

## Blockchain Verification Payload Format

When a photo is analyzed, the system outputs an EIP-712 compatible JSON payload structured as follows:

```json
{
  "standard": "WHEREISMYPHOTO_EIP712_ATTESTATION_V1",
  "merkleRoot": "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
  "attestation": {
    "imageSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "perceptualHash": "a1f09c3e87b21d54",
    "faceDetected": true,
    "isAiGenerated": false,
    "discoveredMatchesCount": 4,
    "timestamp": "2026-09-05T17:00:00.000Z"
  },
  "topMatchedPosts": [
    {
      "platform": "LinkedIn",
      "domain": "linkedin.com",
      "url": "https://linkedin.com/in/example-profile",
      "matchType": "exact",
      "similarityScore": 98.4
    }
  ]
}
```

This payload can be copied directly or downloaded as a `.json` certificate file for smart contract hashing and verification.

---

## Acceptable Use and Anti-Stalking Policy

WhereIsMyPhoto is strictly intended for finding personal photo appearances, tracking unauthorized re-uploads, and auditing intellectual property footprints.

Users are strictly prohibited from using this software for:
- Stalking, tracking, or harassing any individual.
- Non-consensual surveillance, doxxing, or personal identification without authorization.
- Circumventing privacy settings, protective orders, or legal injunctions.

All uploaded images are processed in volatile memory only and are never permanently stored.

---

## License

This project is licensed under the MIT License.
