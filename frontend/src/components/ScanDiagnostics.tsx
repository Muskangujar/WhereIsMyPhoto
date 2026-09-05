"use client";

import React, { useState } from "react";
import { ScanDiagnosticsData } from "@/types";
import {
  ShieldCheck,
  Cpu,
  Focus,
  Fingerprint,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";

interface ScanDiagnosticsProps {
  diagnostics: ScanDiagnosticsData;
}

export function ScanDiagnostics({ diagnostics }: ScanDiagnosticsProps) {
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedPhash, setCopiedPhash] = useState(false);

  const copyToClipboard = (text: string, type: "sha" | "phash") => {
    navigator.clipboard.writeText(text);
    if (type === "sha") {
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    } else {
      setCopiedPhash(true);
      setTimeout(() => setCopiedPhash(false), 2000);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-title text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <Cpu className="h-5 w-5 text-zinc-700" />
          <span>Image and Edge-Case Screening</span>
        </h3>
        <span className="text-xs text-zinc-500 font-mono">
          Timestamp: {new Date(diagnostics.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Face Detection */}
        <div className="p-4 rounded-xl white-card flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 block font-medium uppercase tracking-wider">
              Face Detection
            </span>
            <span className="text-sm font-bold text-zinc-900">
              {diagnostics.facesDetected === 1
                ? "1 Face Localized"
                : diagnostics.facesDetected > 1
                ? `${diagnostics.facesDetected} Faces Found`
                : "No Face Detected"}
            </span>
            <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono">
              {diagnostics.resolution.width} x {diagnostics.resolution.height} px
            </span>
          </div>
        </div>

        {/* Card 2: Sharpness / Blur */}
        <div className="p-4 rounded-xl white-card flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200">
            <Focus className="h-5 w-5 text-zinc-700" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 block font-medium uppercase tracking-wider">
              Sharpness Score
            </span>
            <span className="text-sm font-bold text-zinc-900">
              {diagnostics.sharpnessScore.toFixed(1)} / 100
            </span>
            <span className="text-[10px] text-zinc-600 block mt-0.5 font-medium">
              {diagnostics.isBlurry ? "Low Resolution / Blurry" : "High Contrast Detail"}
            </span>
          </div>
        </div>

        {/* Card 3: AI Synthetic Check */}
        <div className="p-4 rounded-xl white-card flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200">
            {diagnostics.isAiGenerated ? (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            )}
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 block font-medium uppercase tracking-wider">
              AI Generation Check
            </span>
            <span className="text-sm font-bold text-zinc-900">
              {diagnostics.isAiGenerated ? "Synthetic AI Detected" : "Natural Camera Capture"}
            </span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              Confidence: {diagnostics.aiConfidence.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 4: Perceptual Fingerprint */}
        <div className="p-4 rounded-xl white-card flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200">
            <Fingerprint className="h-5 w-5 text-zinc-800" />
          </div>
          <div className="w-full min-w-0">
            <span className="text-[11px] text-zinc-500 block font-medium uppercase tracking-wider">
              Perceptual pHash
            </span>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <span className="text-xs font-mono text-zinc-800 truncate font-semibold">
                {diagnostics.perceptualHash}
              </span>
              <button
                onClick={() => copyToClipboard(diagnostics.perceptualHash, "phash")}
                className="p-1 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
                title="Copy pHash"
              >
                {copiedPhash ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <span className="text-[10px] text-zinc-500 block">Resilient against crops & resizing</span>
          </div>
        </div>
      </div>

      {/* SHA256 Bar */}
      <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-zinc-600">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-zinc-900 font-semibold flex-shrink-0">SHA-256 Digest:</span>
          <span className="truncate text-zinc-700">{diagnostics.sha256}</span>
        </div>
        <button
          onClick={() => copyToClipboard(diagnostics.sha256, "sha")}
          className="flex items-center gap-1.5 self-start sm:self-auto px-3 py-1 rounded bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 font-medium transition-colors flex-shrink-0 text-[11px] shadow-xs"
        >
          {copiedSha ? (
            <>
              <Check className="h-3 w-3 text-emerald-600" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy SHA256</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
