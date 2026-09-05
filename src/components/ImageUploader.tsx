"use client";

import React, { useRef, useState } from "react";
import {
  UploadCloud,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Sparkles,
} from "lucide-react";

interface ImageUploaderProps {
  onImageSelected: (file: File | null, previewUrl: string) => void;
  isScanning: boolean;
  selectedImage: string | null;
  onClear: () => void;
  errorMessage?: string | null;
  successMessage?: string | null;
}

export function ImageUploader({
  onImageSelected,
  isScanning,
  selectedImage,
  onClear,
  errorMessage,
  successMessage,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const processFile = (file: File) => {
    setLocalError(null);
    if (!file.type.startsWith("image/")) {
      setLocalError("Invalid file type. Please upload a JPG, PNG, or WEBP photo.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setLocalError("File size exceeds 15MB limit. Please upload a smaller photo.");
      return;
    }
    const url = URL.createObjectURL(file);
    onImageSelected(file, url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const activeError = localError || errorMessage;

  return (
    <div className="w-full space-y-6">
      {/* Notifications / Alerts */}
      {activeError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
          <span>{activeError}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3">
          <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Upload Dropzone or Active Photo Preview */}
      {!selectedImage ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-10 sm:p-14 flex flex-col items-center justify-center text-center group ${
            isDragging
              ? "border-zinc-900 bg-zinc-50"
              : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-500 hover:bg-zinc-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="h-16 w-16 mb-4 rounded-full bg-white border border-zinc-200 shadow-xs flex items-center justify-center group-hover:scale-105 transition-transform text-zinc-800">
            <UploadCloud className="h-8 w-8" />
          </div>

          <h3 className="font-title text-2xl sm:text-3xl font-bold text-zinc-900 mb-2">
            Upload any photo (celebrity, portrait, or public image)
          </h3>
          <p className="text-sm text-zinc-500 max-w-md">
            Drag and drop your image here, or <span className="underline decoration-zinc-400 font-medium text-zinc-700">browse files</span>. The Groq Vision engine will analyze it in real time.
          </p>

          <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500 bg-white border border-zinc-200 px-3.5 py-1.5 rounded-full shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-zinc-700" />
            <span>Powered by Groq Vision Llama-3.2 & Perceptual Hashing</span>
          </div>
        </div>
      ) : (
        /* Image Preview & Scanning Laser */
        <div className="relative rounded-2xl overflow-hidden white-card p-4 sm:p-6 space-y-4">
          <div className="relative max-h-[420px] w-full flex items-center justify-center bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Uploaded Search Target"
              className="max-h-[420px] w-auto object-contain rounded-lg"
            />

            {/* Laser Line Scanning Effect */}
            {isScanning && (
              <div className="absolute inset-x-0 h-[2px] bg-zinc-900 shadow-[0_0_12px_#18181b] animate-laser z-20 pointer-events-none" />
            )}
          </div>

          {/* Controls below image */}
          <div className="flex items-center justify-between text-xs text-zinc-600 pt-1">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${isScanning ? "bg-amber-500" : "bg-emerald-500"} animate-pulse`} />
              <span className="font-medium text-zinc-700">
                {isScanning ? "Groq Vision analyzing public footprint..." : "Analysis complete & hashed"}
              </span>
            </div>
            <button
              onClick={onClear}
              disabled={isScanning}
              className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-950 transition-colors px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 font-medium"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Upload Another Photo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
