"use client";

import React, { useState } from "react";
import { SearchResponse } from "@/types";
import { Link2, FileCode, Copy, Check, Download, ShieldCheck, ExternalLink } from "lucide-react";

interface BlockchainHandoffProps {
  data: SearchResponse;
}

interface AttestResult {
  txHash: string;
  blockNumber: number;
  merkleRoot: string;
  recordId: string;
  explorerUrl: string | null;
  eip712Signature: string;
}

interface VerifyResult {
  pass: boolean;
  onChainRoot: string;
  computedRoot: string;
  attester: string;
  eip712SignerMatch: boolean;
}

export function BlockchainHandoff({ data }: BlockchainHandoffProps) {
  const [copied, setCopied] = useState(false);
  const [isAttesting, setIsAttesting] = useState(false);
  const [attestResult, setAttestResult] = useState<AttestResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [attestError, setAttestError] = useState<string | null>(null);

  const topResult = data.results[0];

  const fullPayload = {
    standard: "WHEREISMYPHOTO_EIP712_ATTESTATION_V1",
    merkleRoot: data.blockchainPayload.merkleRoot,
    recordId: data.blockchainPayload.recordId,
    attestation: {
      imageSha256: data.diagnostics.sha256,
      facePerceptualHash: data.diagnostics.perceptualHash,
      faceDescriptorHash: data.diagnostics.faceDescriptorHash,
      facesDetected: data.diagnostics.facesDetected,
      discoveredMatchesCount: data.results.length,
      verifiedMatchesCount: data.results.filter((r) => r.verification === "verified").length,
      timestamp: data.diagnostics.timestamp,
    },
    topMatchedPosts: data.results.slice(0, 5).map((r) => ({
      platform: r.source,
      domain: r.domain,
      url: r.url,
      verification: r.verification,
      similarityScore: r.faceDistance !== null ? r.similarity : null,
      faceDistance: r.faceDistance,
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

  const handleAttest = async () => {
    setIsAttesting(true);
    setAttestError(null);
    try {
      const record = {
        imageSha256: data.diagnostics.sha256,
        faceDescriptorHash: data.diagnostics.faceDescriptorHash ?? data.diagnostics.perceptualHash,
        postUrl: topResult?.url ?? "",
        postImageSha256: "",
        similarityScore: topResult?.similarity ?? 0,
        timestampIso: data.diagnostics.timestamp,
      };

      const res = await fetch("/api/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record, network: "localhost" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Attestation failed");
      }

      const { attestResult: att, verifyResult: ver } = await res.json();
      setAttestResult(att);
      setVerifyResult(ver);
    } catch (err: unknown) {
      setAttestError((err as Error).message);
    } finally {
      setIsAttesting(false);
    }
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
              <span>Blockchain Attestation</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 font-sans font-medium">
                EIP-712
              </span>
            </h3>
            <p className="text-xs text-zinc-500">
              Tamper-evident Merkle-tree attestation — write-once on-chain record.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-xs font-medium text-zinc-800 transition-all"
          >
            {copied ? <><Check className="h-3.5 w-3.5 text-emerald-600" /><span>Copied</span></> : <><Copy className="h-3.5 w-3.5 text-zinc-600" /><span>Copy JSON</span></>}
          </button>
          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 text-white hover:bg-black text-xs font-semibold shadow-xs transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Proof</span>
          </button>
        </div>
      </div>

      {/* Merkle Pipeline Visualization */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
          <span className="text-zinc-500 font-mono text-[10px] uppercase font-semibold">Step 1 — Image fingerprint</span>
          <p className="font-semibold text-zinc-900">SHA-256 + dHash</p>
          <p className="text-zinc-600 font-mono text-[11px] truncate">{data.diagnostics.sha256.slice(0, 24)}…</p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
          <span className="text-zinc-500 font-mono text-[10px] uppercase font-semibold">Step 2 — Face embedding</span>
          <p className="font-semibold text-zinc-900">{data.diagnostics.facesDetected} face{data.diagnostics.facesDetected !== 1 ? "s" : ""} → 128-D descriptor</p>
          <p className="text-zinc-600 font-mono text-[11px] truncate">
            {data.diagnostics.faceDescriptorHash?.slice(0, 24) ?? "n/a"}…
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
          <span className="text-zinc-500 font-mono text-[10px] uppercase font-semibold">Step 3 — Merkle root</span>
          <p className="font-semibold text-zinc-900">6-leaf sorted-pair tree</p>
          <p className="text-zinc-700 font-mono text-[11px] truncate font-medium">
            {data.blockchainPayload.merkleRoot.slice(0, 24)}…
          </p>
        </div>
      </div>

      {/* JSON Payload */}
      <div className="relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 text-zinc-100">
        <div className="px-4 py-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-zinc-300" />
            <span className="text-zinc-300 font-medium">Attestation Payload (EIP-712 V1)</span>
          </div>
          <span className="text-[11px] font-mono">JSON / UTF-8</span>
        </div>
        <pre className="p-4 text-xs font-mono text-emerald-400/90 overflow-x-auto max-h-56">
          {payloadString}
        </pre>
      </div>

      {/* Attest Button / Results */}
      <div className="pt-2 border-t border-zinc-200 space-y-3">
        {!attestResult && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-zinc-900 block">Attest on Blockchain</span>
              <span className="text-[11px] text-zinc-500 block">
                Records the Merkle root on-chain (localhost Hardhat node by default).
                Requires a running node + deployed contract — see README.
              </span>
            </div>
            <button
              onClick={handleAttest}
              disabled={isAttesting}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-black text-xs font-semibold transition-all disabled:opacity-50 flex-shrink-0"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isAttesting ? "Broadcasting…" : "Attest on-chain"}</span>
            </button>
          </div>
        )}

        {attestError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            <strong>Attest error:</strong> {attestError}
            <span className="block mt-1 text-red-500">
              Is the Hardhat node running and contract deployed? See README.
            </span>
          </div>
        )}

        {attestResult && verifyResult && (
          <div className="space-y-3">
            <div className={`p-3.5 rounded-xl border text-xs font-mono space-y-1 ${verifyResult.pass ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-center gap-2 font-semibold text-sm">
                {verifyResult.pass
                  ? <><Check className="h-4 w-4 text-emerald-600" /><span className="text-emerald-800">On-chain attestation VERIFIED</span></>
                  : <span className="text-red-800">Verification FAILED</span>}
              </div>
              <p className="text-zinc-600 truncate">Tx: {attestResult.txHash}</p>
              <p className="text-zinc-600">Block: {attestResult.blockNumber}</p>
              <p className="text-zinc-600 truncate">recordId: {attestResult.recordId}</p>
              <p className="text-zinc-600">Attester: {verifyResult.attester}</p>
              <p className="text-zinc-600">EIP-712 signer match: {verifyResult.eip712SignerMatch ? "✓" : "✗"}</p>
              {attestResult.explorerUrl && (
                <a
                  href={attestResult.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on PolygonScan
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
