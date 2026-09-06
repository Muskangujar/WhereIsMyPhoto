export type MatchVerification = "verified" | "probable" | "unverified";

export interface SearchResultItem {
  id: string;
  source: string;
  domain: string;
  url: string;
  title: string;
  snippet: string;
  thumbnail: string;
  similarity: number; // 0 to 100, computed from face distance
  matchType: "exact" | "cropped" | "visually_similar";
  category: "social" | "news" | "blog" | "portfolio";
  verification: MatchVerification;
  faceDistance: number | null;
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
  perceptualHash: string; // dHash
  faceEncodingSample: number[]; // first 8 of 128-D descriptor
  faceDescriptorHash?: string; // sha256 of full 128-D descriptor
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
    recordId?: string;
    imageSha256: string;
    facePerceptualHash: string;
    faceDescriptorHash?: string;
    discoveredCount: number;
    topMatchesHashes: string[];
    timestampIso: string;
  };
}
