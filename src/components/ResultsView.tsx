"use client";

import React, { useState } from "react";
import { SearchResultItem } from "@/types";
import {
  Globe,
  SearchX,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

interface ResultsViewProps {
  results: SearchResultItem[];
  status: "success" | "no_results" | "error";
  onHandoffBlockchain: () => void;
  filteredAccessoriesCount?: number;
}

export function ResultsView({
  results,
  status,
  onHandoffBlockchain,
  filteredAccessoriesCount,
}: ResultsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All Results", count: results.length },
    {
      id: "social",
      label: "Social Platforms",
      count: results.filter((r) => r.category === "social").length,
    },
    {
      id: "blog",
      label: "Blogs & Articles",
      count: results.filter((r) => r.category === "blog").length,
    },
    {
      id: "portfolio",
      label: "Portfolios & Databases",
      count: results.filter((r) => r.category === "portfolio").length,
    },
  ];

  const filteredResults =
    selectedCategory === "all"
      ? results
      : results.filter((r) => r.category === selectedCategory);

  const getMatchTypeBadge = (type: SearchResultItem["matchType"]) => {
    switch (type) {
      case "exact":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-900 text-white">
            Exact Match
          </span>
        );
      case "cropped":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-300">
            Cropped / Modified
          </span>
        );
      case "visually_similar":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-50 text-zinc-600 border border-zinc-200">
            Visually Similar
          </span>
        );
    }
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
            This image has no known public presence across indexed web sources. This indicates a private photo, an offline individual, or unindexed content.
          </p>

          {filteredAccessoriesCount && filteredAccessoriesCount > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200/60 text-[11px] text-amber-900 text-left">
              <span className="font-semibold block mb-0.5">
                Accessory &amp; Eyewear Filter Applied:
              </span>
              Google Lens detected physical accessories (sunglasses, goggles, or frames) and returned {filteredAccessoriesCount} commercial shopping catalog matches. These e-commerce product links were automatically filtered out to focus exclusively on human profiles and web appearances.
            </div>
          )}
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-zinc-200 shadow-xs text-xs text-zinc-800 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Verified Zero Footprint: Ready for Blockchain Attestation</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-title text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-zinc-700" />
            <span>Discovered Web and Social Matches</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 font-sans font-medium">
              {results.length} Found
            </span>
          </h3>
          <p className="text-xs text-zinc-500">
            Public pages and posts where this image or its visual derivatives appear.
          </p>
        </div>

        {/* Categories Tab */}
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

      {/* Grid of Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredResults.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl white-card-hover flex flex-col justify-between group"
          >
            <div>
              {/* Top Meta Bar */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
                  {item.source}
                </span>
                <div className="flex items-center gap-2">
                  {getMatchTypeBadge(item.matchType)}
                  <span className="text-xs font-bold text-zinc-900 font-mono bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">
                    {item.similarity.toFixed(1)}% Match
                  </span>
                </div>
              </div>

              {/* Title & snippet */}
              <div className="flex items-start gap-3 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="h-16 w-16 rounded-xl object-cover flex-shrink-0 border border-zinc-200 shadow-xs group-hover:scale-105 transition-transform"
                />
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

            {/* Bottom link bar */}
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
                <span>Visit Public Page</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
