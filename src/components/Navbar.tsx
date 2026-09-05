"use client";

import React from "react";
import Link from "next/link";
import { Cpu, Key, FileText, Lock } from "lucide-react";

interface NavbarProps {
  onOpenSettings: () => void;
  activeEngine: string;
}

export function Navbar({ onOpenSettings, activeEngine }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-full bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-900 group-hover:border-zinc-900 transition-colors">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          <div>
            <span className="font-title text-xl font-bold tracking-tight text-zinc-950 block leading-none">
              WhereIsMyPhoto
            </span>
            <span className="text-[10px] text-zinc-500 font-sans tracking-wide uppercase mt-0.5 block font-medium">
              Image Footprint Pipeline
            </span>
          </div>
        </Link>

        {/* Right side actions */}
        <div className="flex items-center gap-4 text-xs font-medium">
          {/* Navigation Links */}
          <Link
            href="/terms"
            className="hidden sm:flex items-center gap-1.5 text-zinc-600 hover:text-zinc-950 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Terms & Anti-Stalking</span>
          </Link>

          <Link
            href="/privacy"
            className="hidden sm:flex items-center gap-1.5 text-zinc-600 hover:text-zinc-950 transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Privacy</span>
          </Link>

          {/* Active Engine Selector */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 hover:text-zinc-950 transition-all text-xs font-medium"
          >
            <Cpu className="h-3.5 w-3.5 text-zinc-600" />
            <span className="hidden md:inline text-zinc-500">Engine:</span>
            <span className="text-zinc-900 font-mono text-[11px] font-semibold truncate max-w-[130px]">
              {activeEngine}
            </span>
            <Key className="h-3 w-3 text-zinc-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
