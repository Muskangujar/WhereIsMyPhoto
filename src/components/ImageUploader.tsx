"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  AlertCircle,
  ScanFace,
  Eye,
  Crop,
  Check,
  ShieldCheck,
  ClipboardPaste,
  Search,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  detectFaceOnly,
  drawDlibMesh,
  FaceDetectionResult,
} from "@/lib/face-detector";

interface ImageUploaderProps {
  onImageSelected: (
    file: File | null,
    previewUrl: string,
    faceCropUrl?: string,
    detectionMeta?: {
      confidence: number;
      landmarksCount: number;
    },
    fullOriginalFile?: File | null
  ) => void;
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
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalFileRef = useRef<File | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<FaceDetectionResult | null>(null);
  const [showMesh, setShowMesh] = useState(true);
  const [activeCropPreview, setActiveCropPreview] = useState<string | null>(null);
  const [searchWithFaceCropOnly, setSearchWithFaceCropOnly] = useState(true);

  // When selectedImage changes or clears
  useEffect(() => {
    if (!selectedImage) {
      setDetectionResult(null);
      setActiveCropPreview(null);
      originalFileRef.current = null;
      setLocalError(null);
      setLocalStatus(null);
    }
  }, [selectedImage]);

  // Execute actual search with the chosen mode (Face crop vs Full photo)
  const triggerSearch = useCallback(
    (useFaceCrop: boolean, customDetectionResult?: FaceDetectionResult | null) => {
      const origFile = originalFileRef.current;
      if (!origFile || !selectedImage) return;

      const det = customDetectionResult !== undefined ? customDetectionResult : detectionResult;

      let fileToSearch: File = origFile;
      if (useFaceCrop && det?.faceCropBlob) {
        fileToSearch = new File(
          [det.faceCropBlob],
          `face-crop-${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );
      }

      onImageSelected(
        fileToSearch,
        selectedImage,
        det?.faceCropDataUrl,
        det?.hasFace
          ? {
              confidence: Math.round((det.confidence || 0.95) * 100),
              landmarksCount: det.landmarks?.length || 68,
            }
          : undefined,
        origFile // pass full original file for multi-stage fallback
      );
    },
    [detectionResult, onImageSelected, selectedImage]
  );

  // When image loads in preview, run face detection & dlib 68-point landmarks
  const handleImageLoaded = async () => {
    if (!imageRef.current) return;
    setIsDetecting(true);
    setLocalError(null);
    setLocalStatus("Running dlib 68-point facial landmark analysis...");

    try {
      const result = await detectFaceOnly(imageRef.current);
      setDetectionResult(result);

      if (result.hasFace) {
        setActiveCropPreview(result.faceCropDataUrl || null);

        // Render dlib landmarks to canvas
        if (canvasRef.current && imageRef.current) {
          canvasRef.current.width = imageRef.current.clientWidth;
          canvasRef.current.height = imageRef.current.clientHeight;
          drawDlibMesh(canvasRef.current, imageRef.current, result);
        }

        setLocalStatus("68 biometric landmarks locked. Ready to search.");
        // Auto-trigger search with face crop
        triggerSearch(searchWithFaceCropOnly, result);
      } else {
        setLocalStatus("No clear face detected with 68 landmarks. Searching with full photo.");
        // If no face found, search with full image instead of blocking the user
        triggerSearch(false, result);
      }
    } catch (err) {
      console.error("Face detection failed:", err);
      setLocalStatus("Biometrics unavailable. Searching with full photo.");
      triggerSearch(false, null);
    } finally {
      setIsDetecting(false);
    }
  };

  // Re-draw mesh if window or image resizes or showMesh toggles
  useEffect(() => {
    if (showMesh && detectionResult?.hasFace && canvasRef.current && imageRef.current) {
      canvasRef.current.width = imageRef.current.clientWidth;
      canvasRef.current.height = imageRef.current.clientHeight;
      drawDlibMesh(canvasRef.current, imageRef.current, detectionResult);
    } else if (!showMesh && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [showMesh, detectionResult]);

  const processFile = useCallback((file: File) => {
    setLocalError(null);
    setDetectionResult(null);
    setActiveCropPreview(null);
    setLocalStatus("Loading image...");

    if (!file.type.startsWith("image/") && !/\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i.test(file.name)) {
      setLocalError("Invalid file format. Please upload a JPG, PNG, or WEBP photo.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setLocalError("File size exceeds 20MB limit. Please upload a smaller photo.");
      return;
    }

    originalFileRef.current = file;
    const url = URL.createObjectURL(file);
    // Display image in preview, which triggers handleImageLoaded
    onImageSelected(null, url);
  }, [onImageSelected]);

  // Handle URL string or base64 pasted from clipboard
  const processPastedText = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return false;

    // 1. Base64 Data URL
    if (trimmed.startsWith("data:image/")) {
      try {
        const res = await fetch(trimmed);
        const blob = await res.blob();
        const ext = blob.type.split("/")[1] || "png";
        const file = new File([blob], `clipboard-data-${Date.now()}.${ext}`, {
          type: blob.type,
        });
        processFile(file);
        return true;
      } catch (e) {
        console.warn("Failed to parse data URL:", e);
      }
    }

    // 2. Direct Web URL (Fetch via backend proxy to bypass CORS)
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      setLocalStatus("Fetching image from pasted URL...");
      try {
        const proxyUrl = `/api/fetch-image?url=${encodeURIComponent(trimmed)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const blob = await res.blob();
          if (blob.type.startsWith("image/")) {
            const ext = blob.type.split("/")[1] || "jpg";
            const file = new File([blob], `pasted-url-${Date.now()}.${ext}`, {
              type: blob.type,
            });
            processFile(file);
            return true;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch image URL via proxy:", e);
      }
    }

    return false;
  }, [processFile]);

  // Robust Global Clipboard Listener (Ctrl+V / Cmd+V anywhere on the page)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      // Check 1: Clipboard files (e.g. copied from Windows Explorer or screenshot)
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)) {
            e.preventDefault();
            processFile(file);
            return;
          }
        }
      }

      // Check 2: Clipboard items (standard browser image copy)
      const items = e.clipboardData?.items;
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith("image/")) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              const ext = file.type.split("/")[1] || "png";
              const namedFile = new File([file], `pasted-screenshot-${Date.now()}.${ext}`, {
                type: file.type || "image/png",
              });
              processFile(namedFile);
              return;
            }
          }
        }
      }

      // Check 3: Plain text (image URL or base64)
      const text = e.clipboardData?.getData("text");
      if (text) {
        const handled = await processPastedText(text);
        if (handled) {
          e.preventDefault();
          return;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processFile, processPastedText]);

  // Interactive Paste Button Click Handler
  const handlePasteButtonClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalError(null);

    // Try Method 1: Async Clipboard API
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        if (navigator.clipboard.read) {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            const imageType = item.types.find((t) => t.startsWith("image/"));
            if (imageType) {
              const blob = await item.getType(imageType);
              const ext = imageType.split("/")[1] || "png";
              const file = new File([blob], `clipboard-image-${Date.now()}.${ext}`, {
                type: imageType,
              });
              processFile(file);
              return;
            }
          }
        }
      } catch (readErr) {
        console.warn("navigator.clipboard.read() failed, trying text fallback:", readErr);
      }

      // Try Method 2: Text on clipboard (URL / Data URI)
      try {
        if (navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text) {
            const handled = await processPastedText(text);
            if (handled) return;
          }
        }
      } catch (textErr) {
        console.warn("navigator.clipboard.readText() failed:", textErr);
      }
    }

    // Friendly prompt to use keyboard shortcut
    setLocalError(
      "Direct clipboard reading is restricted by browser security. Please press Ctrl + V (or Cmd + V) on your keyboard to paste directly."
    );
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

  const toggleSearchMode = (useFaceCropOnly: boolean) => {
    setSearchWithFaceCropOnly(useFaceCropOnly);
    triggerSearch(useFaceCropOnly);
  };

  const activeError = localError || errorMessage;

  return (
    <div className="w-full space-y-6">
      {/* Notifications / Alerts */}
      {activeError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
          <span>{activeError}</span>
        </div>
      )}

      {/* Upload Zone or Image Preview */}
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
            <ScanFace className="h-8 w-8 text-zinc-800" />
          </div>

          <h3 className="font-title text-2xl sm:text-3xl font-bold text-zinc-900 mb-2">
            Upload Portrait or Face Photo
          </h3>
          <p className="text-sm text-zinc-500 max-w-md">
            Drag and drop your image here, or{" "}
            <span className="underline decoration-zinc-400 font-medium text-zinc-700">
              browse files
            </span>
            . Auto-detects face and maps 68 dlib facial landmarks to isolate facial geometry.
          </p>

          {/* Direct Clipboard Paste Option */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handlePasteButtonClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ClipboardPaste className="h-4 w-4" />
              <span>Paste Image from Clipboard</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-white border border-zinc-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <span>or press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-300 font-mono text-[10px] font-bold text-zinc-800">
                Ctrl + V
              </kbd>
              <span>anywhere</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500 bg-white border border-zinc-200 px-3.5 py-1.5 rounded-full shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>dlib 68-Point Biometric Facial Landmark Tracking Active</span>
          </div>
        </div>
      ) : (
        /* Image Preview & Biometric Landmark Analysis View */
        <div className="relative rounded-2xl overflow-hidden white-card p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Image with 68 dlib Landmark Canvas Overlay */}
            <div className="lg:col-span-2 relative min-h-[300px] max-h-[460px] w-full flex items-center justify-center bg-zinc-950 rounded-xl overflow-hidden border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={selectedImage}
                alt="Uploaded Target"
                onLoad={handleImageLoaded}
                crossOrigin="anonymous"
                className="max-h-[460px] w-auto object-contain"
              />

              {/* dlib 68-point landmarks overlay canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              />

              {/* Laser Scanning Effect */}
              {(isScanning || isDetecting) && (
                <div className="absolute inset-x-0 h-[2px] bg-emerald-400 shadow-[0_0_14px_#34d399] animate-laser z-20 pointer-events-none" />
              )}

              {/* Status HUD in top corner */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs font-mono">
                {isDetecting ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                    <span>EXTRACTING 68 DLIB LANDMARKS...</span>
                  </>
                ) : detectionResult?.hasFace ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>
                      FACE LOCKED // 68 PTS ({Math.round((detectionResult.confidence || 0.95) * 100)}%)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>PHOTO READY (NO LANDMARK LOCK)</span>
                  </>
                )}
              </div>
            </div>

            {/* Side Panel: Isolated Face Crop & Biometrics */}
            <div className="flex flex-col justify-between space-y-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Crop className="h-3.5 w-3.5 text-zinc-700" />
                    <span>Isolated Portrait Headshot</span>
                  </h4>
                  {detectionResult?.hasFace && (
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Face Isolated
                    </span>
                  )}
                </div>

                {activeCropPreview ? (
                  <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden border-2 border-emerald-500/40 bg-zinc-900 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeCropPreview}
                      alt="Face Crop Only"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-xs text-[10px] text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                      FACE CROP
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square w-full max-w-[200px] mx-auto rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 text-xs text-center p-4">
                    {isDetecting
                      ? "Isolating facial coordinates..."
                      : "Full photo mode active"}
                  </div>
                )}

                <div className="space-y-1.5 text-xs text-zinc-600">
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Biometric Points</span>
                    <span className="font-mono font-medium text-zinc-900">
                      {detectionResult?.hasFace ? "68 dlib markers" : "Full image"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Clothing/Background</span>
                    <span className="font-semibold text-emerald-600">
                      {detectionResult?.hasFace && searchWithFaceCropOnly ? "Excluded (Face Locked)" : "Included"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Search Target</span>
                    <span className="font-medium text-zinc-900">
                      {searchWithFaceCropOnly && detectionResult?.hasFace ? "Isolated Face Crop" : "Full Photo"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mode Options */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSearchMode(true)}
                    disabled={!detectionResult?.hasFace || isScanning}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                      searchWithFaceCropOnly && detectionResult?.hasFace
                        ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                        : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100 disabled:opacity-40"
                    }`}
                  >
                    <Check className={`h-3 w-3 ${searchWithFaceCropOnly && detectionResult?.hasFace ? "opacity-100" : "opacity-0"}`} />
                    <span>Search Face Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSearchMode(false)}
                    disabled={isScanning}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                      !searchWithFaceCropOnly || !detectionResult?.hasFace
                        ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                        : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    <Check className={`h-3 w-3 ${!searchWithFaceCropOnly || !detectionResult?.hasFace ? "opacity-100" : "opacity-0"}`} />
                    <span>Full Photo</span>
                  </button>
                </div>

                {detectionResult?.hasFace && (
                  <button
                    type="button"
                    onClick={() => setShowMesh(!showMesh)}
                    className="w-full py-1.5 px-2.5 rounded-lg text-xs font-medium border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="h-3 w-3 text-zinc-500" />
                    <span>{showMesh ? "Hide 68-Pt Landmark Mesh" : "Show 68-Pt Landmark Mesh"}</span>
                  </button>
                )}

                {/* Primary Scan Button */}
                <button
                  type="button"
                  onClick={() => triggerSearch(searchWithFaceCropOnly && !!detectionResult?.hasFace)}
                  disabled={isScanning || isDetecting}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                      <span>Searching Public Web...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 text-emerald-400" />
                      <span>
                        {searchWithFaceCropOnly && detectionResult?.hasFace
                          ? "Search Public Web for this Face"
                          : "Search Public Web with Photo"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Controls below image */}
          <div className="flex flex-wrap items-center justify-between text-xs text-zinc-600 pt-2 gap-2 border-t border-zinc-100">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isScanning || isDetecting
                    ? "bg-amber-500 animate-ping"
                    : detectionResult?.hasFace
                    ? "bg-emerald-500"
                    : "bg-zinc-400"
                }`}
              />
              <span className="font-medium text-zinc-700">
                {localStatus ||
                  (isDetecting
                    ? "Computing 68 dlib landmark biometrics..."
                    : isScanning
                    ? "Querying Google Lens across public web & social platforms..."
                    : detectionResult?.hasFace
                    ? "Face locked and ready for reverse search"
                    : "Photo loaded and ready for search")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePasteButtonClick}
                disabled={isScanning || isDetecting}
                className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-950 transition-colors px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 font-medium cursor-pointer"
              >
                <ClipboardPaste className="h-3 w-3" />
                <span>Paste Another (Ctrl+V)</span>
              </button>

              <button
                onClick={onClear}
                disabled={isScanning || isDetecting}
                className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-950 transition-colors px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 font-medium cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Upload Different Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
