export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { attestRecord, verifyRecord } from "@/lib/chain";
import type { DiscoveryRecord } from "@/lib/merkle";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { record, network = "localhost" } = body as {
      record: DiscoveryRecord;
      network?: string;
    };

    if (!record?.imageSha256) {
      return NextResponse.json({ error: "Missing record fields" }, { status: 400 });
    }

    const attestResult = await attestRecord(record, network);
    const verifyResult = await verifyRecord(record, attestResult, network);

    return NextResponse.json({ attestResult, verifyResult });
  } catch (err: unknown) {
    console.error("Attest error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "Attest failed" },
      { status: 500 }
    );
  }
}
