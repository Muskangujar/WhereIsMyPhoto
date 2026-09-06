"use client";

import React, { useState } from "react";
import { SearchResultItem } from "@/types";
import { Globe, SearchX, ArrowUpRight, ShieldCheck } from "lucide-react";

interface ResultsViewProps {
  results: SearchResultItem[];
  status: "success" | "no_results" | "error";
  onHandoffBlockchain: () => void;
}

export function ResultsView({ results, status, onHandoffBlockchain }: ResultsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All Results", count: results.length },
    { id: "social", label: "Social", count: results.filter((r) => r.category === "social").length },
    { id: "news", label: "News", count: results.filter((r) => r.category === "news").length },
    { id: "portfolio", label: "Other", count: results.filter((r) => r.category !== "social" && r.category !== "news").length },
  ];

  const filteredResults =
    selectedCategory === "all"
      ? results
      : selectedCategory === "portfolio"
      ? results.filter((r) => r.category !== "social" && r.category !== "news")
      : results.filter((r) => r.category === selectedCategory);

  const getVerificationBadge = (item: SearchResultItem) => {
    if (item.verification === "verified") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✓ Face Verified
        </span>
      );
    }
    if (item.verification === "probable") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          ~ Probable Match
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-50 text-zinc-600 border border-zinc-200">
        Visual Only
      </span>
    );
  };

  const getSimilarityColor = (item: SearchResultItem) => {
    if (item.similarity === 0 || item.faceDistance === null) return "text-zinc-400";
    if (item.verification === "verified") return "text-emerald-700";
    if (item.verification === "probable") return "text-amber-700";
    return "text-zinc-600";
  };

  if (status === "no_results" || results.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-2xl white-card text-center border border-zinc-200 space-y-4 bg-zinc-50/50">
        <div className="h-14 w-14 mx-auto rounded-full bg-white border border-zinc-200 shadow-xs flex items-center justify-center text-zinc-500">
          <SearchX className="h-7 w-7" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="font-title text-2xl font-bold text-zinc-900">
            Zero Public Web Matches Found
          </h3>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
            This image has no known public presence across indexed web sources.
            This typically indicates a private photo, an offline individual, or unindexed content.
          </p>
        </div>
        <button
          onClick={onHandoffBlockchain}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-zinc-200 shadow-xs text-xs text-zinc-800 font-medium hover:bg-zinc-50 transition-colors"
        >
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Attest Zero Footprint on Blockchain</span>
        </button>
      </div>
    );
  }

  const verifiedCount = results.filter((r) => r.verification === "verified").length;
  const probableCount = results.filter((r) => r.verification === "probable").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-title text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-zinc-700" />
            <span>Discovered Web Matches</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 font-sans font-medium">
              {results.length} Found
            </span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {verifiedCount > 0 && (
              <span className="text-emerald-600 font-medium">{verifiedCount} face-verified</span>
            )}
            {verifiedCount > 0 && probableCount > 0 && <span> · </span>}
            {probableCount > 0 && (
              <span className="text-amber-600 font-medium">{probableCount} probable</span>
            )}
            {verifiedCount === 0 && probableCount === 0 && (
              <span>No face matches confirmed — similarity scores from visual metadata only</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 border border-zinc-200 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-white text-zinc-900 shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredResults.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl white-card-hover flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
                  {item.source}
                </span>
                <div className="flex items-center gap-2">
                  {getVerificationBadge(item)}
                  {item.faceDistance !== null ? (
                    <span className={`text-xs font-bold font-mono bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200 ${getSimilarityColor(item)}`}>
                      {item.similarity.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400 font-mono bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">
                      n/a
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 mb-4">
                {item.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="h-16 w-16 rounded-xl object-cover flex-shrink-0 border border-zinc-200 shadow-xs group-hover:scale-105 transition-transform"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="overflow-hidden">
                  <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-black transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-zinc-600 line-clamp-2 mt-1 leading-relaxed">
                    {item.snippet}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-mono truncate max-w-[200px]">
                {item.domain}
              </span>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-zinc-900 hover:text-black font-semibold transition-colors"
              >
                <span>Visit Page</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
