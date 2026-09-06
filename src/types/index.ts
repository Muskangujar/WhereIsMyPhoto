export interface SearchResultItem {
  id: string;
  source: string;
  domain: string;
  url: string;
  title: string;
  snippet: string;
  thumbnail: string;
  similarity: number; // 0 to 100
  matchType: "exact" | "cropped" | "visually_similar";
  category: "social" | "news" | "blog" | "portfolio";
}

export interface ScanDiagnosticsData {
  facesDetected: number;
  faceBoundingBox?: { x: number; y: number; width: number; height: number };
  sharpnessScore: number; // 0 to 100
  resolution: { width: number; height: number };
  isAiGenerated: boolean;
  aiConfidence: number; // 0 to 100
  isBlurry: boolean;
  sha256: string;
  perceptualHash: string;
  filteredAccessoriesCount?: number;
  faceEncodingSample: number[];
  timestamp: string;
}

export interface SearchResponse {
  queryId: string;
  status: "success" | "no_results" | "error";
  diagnostics: ScanDiagnosticsData;
  results: SearchResultItem[];
  blockchainPayload: {
    schemaVersion: string;
    merkleRoot: string;
    imageSha256: string;
    facePerceptualHash: string;
    discoveredCount: number;
    topMatchesHashes: string[];
    timestampIso: string;
  };
}
