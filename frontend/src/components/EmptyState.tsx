import React from "react";
import { Search } from "lucide-react";

export function EmptyState() {
  return (
    <div className="rounded-2xl white-card p-8 sm:p-12 text-center space-y-8 bg-zinc-50/50">
      <div className="max-w-xl mx-auto space-y-3">
        <div className="h-12 w-12 mx-auto rounded-full bg-white border border-zinc-200 flex items-center justify-center shadow-xs">
          <Search className="h-6 w-6 text-zinc-700" />
        </div>
        <h3 className="font-title text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight">
          Ready to Scan for Image Footprint
        </h3>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Upload any photo above to inspect its public presence across social media, blogs, news articles, and open forums.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-zinc-900 font-medium text-xs">
            <span className="h-5 w-5 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[11px] font-mono font-bold">1</span>
            <span>Image Reverse Search</span>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Searches for the photo across public internet indexes, locating exact duplicates, cropped versions, and modified copies.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-zinc-900 font-medium text-xs">
            <span className="h-5 w-5 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[11px] font-mono font-bold">2</span>
            <span>Edge-Case Screening</span>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Automatically evaluates image sharpness, synthetic AI generation probability, and offline privacy indicators.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-zinc-900 font-medium text-xs">
            <span className="h-5 w-5 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[11px] font-mono font-bold">3</span>
            <span>Blockchain Attestation</span>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Generates verifiable SHA-256 and Merkle proof payloads ready for tamper-evident recording on decentralized ledgers.
          </p>
        </div>
      </div>
    </div>
  );
}
