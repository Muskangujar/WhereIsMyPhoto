export const runtime = "nodejs";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { getImageDiagnostics } from "@/lib/diagnostics";
import { detectFaces, cropFace, descriptorHash } from "@/lib/face";
import { searchWithLens, LensCandidate } from "@/lib/search";
import { verifyCandidates } from "@/lib/verify-face";
import type { SearchResponse } from "@/types";

function isCommerceOrAccessory(item: LensCandidate): boolean {
  const title = (item.title || "").toLowerCase();
  const snippet = (item.snippet || "").toLowerCase();
  const url = (item.url || "").toLowerCase();
  const source = (item.source || "").toLowerCase();
  const text = `${title} ${snippet} ${url} ${source}`;

  // E-commerce shopping URL paths
  if (
    url.includes("/products/") ||
    url.includes("/product/") ||
    url.includes("/item/") ||
    url.includes("/items/") ||
    url.includes("/p/") ||
    url.includes("/pd/") ||
    url.includes("/dp/") ||
    url.includes("/gp/") ||
    url.includes("/shop/") ||
    url.includes("/cart/") ||
    url.includes("/stores/") ||
    url.includes("/buy/")
  ) {
    return true;
  }

  // Commercial / Retail / Shopping domains
  const shoppingDomains = [
    "bobleisure", "amazon", "walmart", "ebay", "aliexpress", "temu", "shein",
    "dhgate", "target.com", "etsy", "mercari", "grailed", "zalando", "dillard",
    "farfetch", "harrods", "ashford", "wmpeyewear", "alensa", "shadestation",
    "revantoptics", "safetyglasses", "frameandoptic", "blenderseyewear",
    "smithoptics", "otticamauro", "trendhim", "metalshop", "handicraft", "ubuy",
    "desertcart", "footy.com", "openbox", "optimaloptic", "twelveweight",
    "knockaround", "super-shop", "jlmatthews", "bedbathandbeyond", "faire.com",
    "wye-delta", "sportisimo", "nordstrom", "trendyol", "amevista", "styliafoe",
    "dalessandro", "twenty4action", "hawkersco", "pinibike", "bloemenverlinde",
    "noon.com", "intialpaca", "shades", "optical", "optics", "eyewear",
    "sunglass", "goggle",
  ];
  if (shoppingDomains.some((d) => url.includes(d) || source.includes(d))) {
    return true;
  }

  // Product / Gear / Apparel keywords
  const productWords = [
    "sunglass", "goggle", "eyewear", "eyeglass", "spectacle", "glass", "shade",
    "optic", "lens", "gafas", "occhiali", "polarized", "muffler", "scarf",
    "shemagh", "keffiyeh", "jacket", "coat", "parka", "fleece", "hoodie",
    "shirt", "pants", "trousers", "gear", "accessoire", "accessory",
    "accessories", "fishing", "hunting", "apparel", "clothing", "wholesale",
    "buy online", "price", "in stock", "free shipping", "order now",
  ];
  if (productWords.some((w) => text.includes(w))) {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fullFile = formData.get("fullFile") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/jpeg";

    // ── Real diagnostics ──────────────────────────────────────────────
    const diag = await getImageDiagnostics(buffer);

    // ── Real face detection ───────────────────────────────────────────
    const faces = await detectFaces(buffer);

    if (faces.length === 0) {
      return NextResponse.json(
        {
          queryId: `scan_${Date.now()}`,
          status: "no_results",
          diagnostics: {
            facesDetected: 0,
            sharpnessScore: diag.sharpnessScore,
            resolution: { width: diag.width, height: diag.height },
            isAiGenerated: false,
            aiConfidence: 0,
            isBlurry: diag.isBlurry,
            sha256: diag.sha256,
            perceptualHash: diag.dHash,
            faceEncodingSample: [],
            timestamp: new Date().toISOString(),
          },
          results: [],
          blockchainPayload: {
            schemaVersion: "eip712-whereismyphoto-v1",
            merkleRoot: "0x" + "0".repeat(64),
            imageSha256: diag.sha256,
            facePerceptualHash: diag.dHash,
            discoveredCount: 0,
            topMatchesHashes: [],
            timestampIso: new Date().toISOString(),
          },
        } satisfies SearchResponse,
        { status: 200 }
      );
    }

    const primaryFace = faces[0];
    const faceHash = descriptorHash(primaryFace.descriptor);

    // Crop face for second Lens query
    const faceCrop = await cropFace(buffer, primaryFace.box).catch(() => null);

    // ── Real search ───────────────────────────────────────────────────
    const serperKey = process.env.SERPER_API_KEY;
    const offline = !serperKey;

    // If primary face crop yielded no candidates, fall back to full image buffer
    let candidates = await searchWithLens(
      buffer,
      faceCrop,
      mimeType,
      serperKey,
      offline
    );

    if (candidates.length === 0 && fullFile) {
      const fullBuffer = Buffer.from(await fullFile.arrayBuffer());
      candidates = await searchWithLens(
        fullBuffer,
        null,
        fullFile.type || "image/jpeg",
        serperKey,
        offline
      );
    }

    // Apply commerce / accessory filter (friend's additive feature)
    const preFilterCount = candidates.length;
    const filteredCandidates = candidates.filter((c) => !isCommerceOrAccessory(c));
    const filteredAccessoriesCount = preFilterCount - filteredCandidates.length;

    // ── Face-verified matching ────────────────────────────────────────
    const verified = await verifyCandidates(filteredCandidates.slice(0, 15), primaryFace);
    const timestampIso = new Date().toISOString();

    const results = verified.slice(0, 15).map((v, idx) => ({
      id: `res-lens-${idx + 1}`,
      source: v.candidate.source ?? v.domain,
      domain: v.domain,
      url: v.candidate.url,
      title: v.candidate.title ?? "Public Page with Matching Photo",
      snippet: v.candidate.snippet ?? `Indexed visual appearance on ${v.domain}.`,
      thumbnail: v.candidate.thumbnailUrl ?? v.candidate.imageUrl ?? "",
      similarity: v.similarityPct ?? 0,
      matchType: (
        v.verification === "verified"
          ? "exact"
          : v.verification === "probable"
          ? "cropped"
          : "visually_similar"
      ) as "exact" | "cropped" | "visually_similar",
      category: v.category,
      verification: v.verification,
      faceDistance: v.faceDistance,
    }));

    // ── Merkle root ───────────────────────────────────────────────────
    const { buildDiscoveryMerkle } = await import("@/lib/merkle");
    const topMatch = verified[0];
    const merklePayload = topMatch
      ? buildDiscoveryMerkle({
          imageSha256: diag.sha256,
          faceDescriptorHash: faceHash,
          postUrl: topMatch.candidate.url,
          postImageSha256: topMatch.postImageSha256 ?? "",
          similarityScore: topMatch.similarityPct ?? 0,
          timestampIso,
        })
      : null;

    return NextResponse.json({
      queryId: `scan_${Date.now()}`,
      status: results.length > 0 ? "success" : "no_results",
      diagnostics: {
        facesDetected: faces.length,
        faceBoundingBox: primaryFace.box,
        filteredAccessoriesCount,
        sharpnessScore: diag.sharpnessScore,
        resolution: { width: diag.width, height: diag.height },
        isAiGenerated: false,
        aiConfidence: 0,
        isBlurry: diag.isBlurry,
        sha256: diag.sha256,
        perceptualHash: diag.dHash,
        faceEncodingSample: Array.from(primaryFace.descriptor.slice(0, 8)).map(
          (f) => parseFloat(f.toFixed(4))
        ),
        faceDescriptorHash: faceHash,
        timestamp: timestampIso,
      },
      results,
      blockchainPayload: {
        schemaVersion: "eip712-whereismyphoto-v1",
        merkleRoot: merklePayload?.merkleRoot ?? "0x" + "0".repeat(64),
        recordId: merklePayload?.recordId,
        imageSha256: diag.sha256,
        facePerceptualHash: diag.dHash,
        faceDescriptorHash: faceHash,
        discoveredCount: results.length,
        topMatchesHashes: results
          .slice(0, 5)
          .map((r) =>
            "0x" +
            Buffer.from(
              new TextEncoder().encode(r.url)
            ).toString("hex").slice(0, 64)
          ),
        timestampIso,
      },
    } satisfies SearchResponse);
  } catch (error: unknown) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to process scan" },
      { status: 500 }
    );
  }
}
