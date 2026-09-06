"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ImageUploader } from "@/components/ImageUploader";
import { EmptyState } from "@/components/EmptyState";
import { ScanDiagnostics } from "@/components/ScanDiagnostics";
import { ResultsView } from "@/components/ResultsView";
import { BlockchainHandoff } from "@/components/BlockchainHandoff";
import { ApiSettingsModal } from "@/components/ApiSettingsModal";
import { SearchResponse } from "@/types";
import {
  Search,
  Shield,
  Database,
  Cpu,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<SearchResponse | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeEngine, setActiveEngine] = useState<string>(
    "Google Lens (Serper) & Groq Vision"
  );
  const [apiKey, setApiKey] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleImageSelected = async (
    file: File | null,
    previewUrl: string,
    faceCropUrl?: string,
    detectionMeta?: {
      confidence: number;
      landmarksCount: number;
    },
    fullOriginalFile?: File | null
  ) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedImage(previewUrl);

    if (!file) {
      // Waiting for face detection or user action
      return;
    }

    setIsScanning(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (fullOriginalFile && fullOriginalFile !== file) {
        formData.append("fullFile", fullOriginalFile);
      }
      formData.append("engine", activeEngine);
      formData.append("apiKey", apiKey);

      const res = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Search pipeline failed to process image.");
      }

      const data: SearchResponse = await res.json();
      setScanResult(data);
      if (detectionMeta) {
        setSuccessMessage(
          `Face locked (${detectionMeta.landmarksCount} dlib landmarks, ${detectionMeta.confidence}% confidence). Background noise excluded.`
        );
      } else {
        setSuccessMessage("Photo analyzed by Groq Vision and hashed successfully.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred during search.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setScanResult(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSaveEngine = (engine: string, key: string) => {
    setActiveEngine(engine);
    setApiKey(key);
    setSuccessMessage(`Engine updated to: ${engine}`);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col selection:bg-zinc-200 selection:text-black">
      {/* Navbar */}
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeEngine={activeEngine}
      />

      {/* Hero with Interactive Cobe Globe */}
      <HeroSection />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Step 1: Upload */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-title text-2xl sm:text-3xl font-bold text-zinc-900 flex items-center gap-2">
              <Search className="h-5 w-5 text-zinc-700" />
              <span>Step 1: Upload Photo to Analyze Footprint</span>
            </h2>
            <span className="text-xs text-zinc-500 font-medium">
              Live Groq Vision + Cryptographic Hashing
            </span>
          </div>

          <ImageUploader
            onImageSelected={handleImageSelected}
            isScanning={isScanning}
            selectedImage={selectedImage}
            onClear={handleClear}
            errorMessage={errorMessage}
            successMessage={successMessage}
          />
        </section>

        {/* Empty State when no scan has been performed yet */}
        {!scanResult && !isScanning && (
          <section className="animate-in fade-in duration-300">
            <EmptyState />
          </section>
        )}

        {/* Step 2: Diagnostics */}
        {scanResult && (
          <section className="space-y-4 animate-in fade-in duration-400">
            <ScanDiagnostics diagnostics={scanResult.diagnostics} />
          </section>
        )}

        {/* Step 3: Search Results */}
        {scanResult && (
          <section className="space-y-4 animate-in fade-in duration-400">
            <ResultsView
              results={scanResult.results}
              status={scanResult.status}
              filteredAccessoriesCount={scanResult.diagnostics.filteredAccessoriesCount}
              onHandoffBlockchain={() => {
                document
                  .getElementById("blockchain-section")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </section>
        )}

        {/* Step 4: Blockchain Handoff */}
        {scanResult && (
          <section id="blockchain-section" className="space-y-4 pt-4">
            <BlockchainHandoff data={scanResult} />
          </section>
        )}

        {/* Architecture & Edge-Case Guide */}
        <section className="rounded-2xl white-card p-6 sm:p-8 space-y-6 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-white border border-zinc-200 text-zinc-900 shadow-xs">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-title text-2xl font-bold text-zinc-900">
                How WhereIsMyPhoto Handles Real-World Edge Cases
              </h3>
              <p className="text-xs text-zinc-500">
                Architectural separation between reverse image search and personal surveillance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-zinc-900 font-semibold">
                <Shield className="h-4 w-4 text-zinc-700" />
                <span>1. Non-Web and Private Person</span>
              </div>
              <p className="text-zinc-600 leading-relaxed">
                If the individual is not on social media or the photo has not been published publicly, the pipeline outputs a verified <strong>Zero Footprint Attestation</strong> hash for privacy records.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-zinc-900 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-zinc-700" />
                <span>2. AI Generated and Synthetic Faces</span>
              </div>
              <p className="text-zinc-600 leading-relaxed">
                Frequency analysis and diffusion artifact detection flag synthetic images before querying the web, marking the output with an <strong>AI Synthetic Warning</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-zinc-900 font-semibold">
                <Database className="h-4 w-4 text-zinc-700" />
                <span>3. Tamper-Proof Merkle Proof</span>
              </div>
              <p className="text-zinc-600 leading-relaxed">
                Combines SHA-256 and Perceptual Hash with discovered match URLs into an EIP-712 formatted Merkle Tree ready for any EVM or Solana smart contract.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50 py-8 text-center text-xs text-zinc-500">
        <p>
          WhereIsMyPhoto • Built for Reverse Image Search and Blockchain Verification Hackathon Pipeline
        </p>
      </footer>

      {/* API Config Modal */}
      <ApiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeEngine={activeEngine}
        onSaveEngine={handleSaveEngine}
      />
    </div>
  );
}
