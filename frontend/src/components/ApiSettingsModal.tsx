"use client";

import React, { useState } from "react";
import { X, Key, Cpu, Sparkles, Check, Shield } from "lucide-react";

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEngine: string;
  onSaveEngine: (engine: string, apiKey: string) => void;
}

export function ApiSettingsModal({
  isOpen,
  onClose,
  activeEngine,
  onSaveEngine,
}: ApiSettingsModalProps) {
  const [engine, setEngine] = useState(activeEngine);
  const [apiKey, setApiKey] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveEngine(engine, apiKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-zinc-200 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-900">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-title text-2xl font-bold text-zinc-900">
              Vision & Search Engine Configuration
            </h3>
            <p className="text-xs text-zinc-500">
              Select image footprint analyzer or provide custom credentials
            </p>
          </div>
        </div>

        {/* Engine Selection */}
        <div className="space-y-3">
          {/* Option 1: Groq Vision */}
          <div
            onClick={() => setEngine("Groq Vision (Llama-3.2)")}
            className={`p-4 rounded-xl cursor-pointer border transition-all flex items-start gap-3 ${
              engine.includes("Groq")
                ? "bg-zinc-50 border-zinc-900 text-zinc-900 shadow-xs"
                : "bg-white border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200 mt-0.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900">
                  Groq Vision (Llama-3.2-11b) • Active
                </span>
                {engine.includes("Groq") && (
                  <Check className="h-4 w-4 text-zinc-900" />
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Live facial footprint analysis, celebrity/public figure detection, and synthetic AI anomaly screening.
              </p>
            </div>
          </div>

          {/* Option 2: Google Cloud Vision */}
          <div
            onClick={() => setEngine("Google Cloud Vision")}
            className={`p-4 rounded-xl cursor-pointer border transition-all flex items-start gap-3 ${
              engine === "Google Cloud Vision"
                ? "bg-zinc-50 border-zinc-900 text-zinc-900 shadow-xs"
                : "bg-white border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200 mt-0.5">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900">
                  Google Cloud Vision (Web Detection)
                </span>
                {engine === "Google Cloud Vision" && (
                  <Check className="h-4 w-4 text-zinc-900" />
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Direct Web Detection indexing pages with matching images (1,000 requests/month free).
              </p>
            </div>
          </div>

          {/* Option 3: SerpApi Google Lens */}
          <div
            onClick={() => setEngine("SerpApi (Google Lens)")}
            className={`p-4 rounded-xl cursor-pointer border transition-all flex items-start gap-3 ${
              engine.includes("SerpApi")
                ? "bg-zinc-50 border-zinc-900 text-zinc-900 shadow-xs"
                : "bg-white border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200 mt-0.5">
              <Key className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900">
                  SerpApi (Google Lens Reverse Search)
                </span>
                {engine.includes("SerpApi") && (
                  <Check className="h-4 w-4 text-zinc-900" />
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Searches Google Lens across public social media platforms.
              </p>
            </div>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-700">
            Override API Key for {engine} (Optional):
          </label>
          <input
            type="password"
            placeholder="Key configured in .env (or paste override here)..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:border-zinc-900 font-mono"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-all"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
