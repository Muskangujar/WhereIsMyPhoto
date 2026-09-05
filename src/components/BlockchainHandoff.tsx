"use client";

import React, { useState } from "react";
import { SearchResponse } from "@/types";
import {
  Link2,
  FileCode,
  Copy,
  Check,
  Download,
  ShieldCheck,
} from "lucide-react";

interface BlockchainHandoffProps {
  data: SearchResponse;
}

export function BlockchainHandoff({ data }: BlockchainHandoffProps) {
  const [copied, setCopied] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const fullPayload = {
    standard: "WHEREISMYPHOTO_EIP712_ATTESTATION_V1",
    merkleRoot: data.blockchainPayload.merkleRoot,
    attestation: {
      imageSha256: data.diagnostics.sha256,
      perceptualHash: data.diagnostics.perceptualHash,
      faceDetected: data.diagnostics.facesDetected > 0,
      isAiGenerated: data.diagnostics.isAiGenerated,
      discoveredMatchesCount: data.results.length,
      timestamp: data.diagnostics.timestamp,
    },
    topMatchedPosts: data.results.slice(0, 5).map((r) => ({
      platform: r.source,
      domain: r.domain,
      url: r.url,
      matchType: r.matchType,
      similarityScore: r.similarity,
    })),
  };

  const payloadString = JSON.stringify(fullPayload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(payloadString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([payloadString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `photo-proof-${data.diagnostics.sha256.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSimulateMint = () => {
    setIsMinting(true);
    setTimeout(() => {
      setIsMinting(false);
      const fakeTx = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`;
      setTxHash(fakeTx);
    }, 1500);
  };

  return (
    <div className="rounded-2xl white-card p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-xs">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-title text-2xl font-bold text-zinc-900 flex items-center gap-2">
              <span>Blockchain Verification and Attestation</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 font-sans font-medium">
                EIP-712 Schema
              </span>
            </h3>
            <p className="text-xs text-zinc-500">
              Tamper-evident cryptographic payload formatted for smart contracts and decentralized verification.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-xs font-medium text-zinc-800 transition-all"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Copied Payload</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-zinc-600" />
                <span>Copy JSON</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 text-white hover:bg-black text-xs font-semibold shadow-xs transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Proof Certificate</span>
          </button>
        </div>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
          <span className="text-zinc-500 font-mono text-[10px] uppercase font-semibold">Step 1: Input Hash</span>
          <p className="font-semibold text-zinc-900">Face Scan and pHash</p>
          <p className="text-zinc-600 font-mono text-[11px] truncate">
            {data.diagnostics.perceptualHash}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
          <span className="text-zinc-500 font-mono text-[10px] uppercase font-semibold">Step 2: Discovered Footprint</span>
          <p className="font-semibold text-zinc-900">Public Endpoints</p>
          <p className="text-zinc-600 font-mono text-[11px] truncate">
            {data.results.length} Indexed Matches
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
          <span className="text-zinc-500 font-mono text-[10px] uppercase font-semibold">Step 3: Cryptographic Root</span>
          <p className="font-semibold text-zinc-900">Merkle Root</p>
          <p className="text-zinc-700 font-mono text-[11px] truncate font-medium">
            {data.blockchainPayload.merkleRoot}
          </p>
        </div>
      </div>

      {/* JSON Payload Code Block */}
      <div className="relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 text-zinc-100">
        <div className="px-4 py-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-zinc-300" />
            <span className="text-zinc-300 font-medium">Standard Attestation Payload</span>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">JSON / UTF-8</span>
        </div>
        <pre className="p-4 text-xs font-mono text-emerald-400/90 overflow-x-auto max-h-56">
          {payloadString}
        </pre>
      </div>

      {/* Testnet Mint Action */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-200">
        <div>
          <span className="text-xs font-semibold text-zinc-900 block">
            Testnet Attestation Simulation
          </span>
          <span className="text-[11px] text-zinc-500 block">
            Record verification fingerprint on blockchain testnets (Sepolia / Polygon)
          </span>
        </div>

        {!txHash ? (
          <button
            onClick={handleSimulateMint}
            disabled={isMinting}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-900 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{isMinting ? "Broadcasting Attestation..." : "Attest on Blockchain"}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 font-medium">
            <Check className="h-4 w-4 text-emerald-600" />
            <span className="truncate max-w-[260px]">Tx: {txHash}</span>
          </div>
        )}
      </div>
    </div>
  );
}
