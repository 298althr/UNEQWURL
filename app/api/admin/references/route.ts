/**
 * API route: /api/admin/references
 * GET  — list all reference tracks
 * POST — upload a new reference track (file or URL), analyze it, store spectral balance
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { query } from "@/lib/db";
import { decodeAudio } from "@/lib/audio/decoder";
import { analyzeReferenceTrack, upsertReferenceTrack, getAllReferences } from "@/lib/audio/reference-analysis";
import { ensureInit } from "@/lib/audio/libsonare-analyzer";
import { uploadFile, getDownloadUrl } from "@/lib/b2-storage";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const references = await getAllReferences(false);
    return NextResponse.json({ references });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const genre = formData.get("genre") as string;
    const title = formData.get("title") as string;
    const artist = (formData.get("artist") as string) || undefined;
    const notes = (formData.get("notes") as string) || undefined;
    const fileUrl = (formData.get("file_url") as string) || undefined;
    const file = formData.get("file") as File | null;

    if (!genre || !title) {
      return NextResponse.json({ error: "genre and title are required" }, { status: 400 });
    }

    if (!file && !fileUrl) {
      return NextResponse.json({ error: "Either a file or file_url is required" }, { status: 400 });
    }

    // Determine the source URL for decoding
    let decodeUrl: string;
    let b2FileName: string | undefined;

    if (file) {
      // Upload to B2
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "mp3";
      const safeName = `${genre}-${Date.now()}.${ext}`;
      const b2Result = await uploadFile("admin", "reference", safeName, buffer, file.type);
      b2FileName = b2Result.fileName;
      decodeUrl = getDownloadUrl(b2FileName);
    } else {
      decodeUrl = fileUrl!;
    }

    // Decode and analyze
    await ensureInit();
    const decoded = decodeAudio(decodeUrl, 180);
    const spectralBalance = await analyzeReferenceTrack(decoded);

    // Store in DB
    const ref = await upsertReferenceTrack({
      genre,
      title,
      artist,
      b2_file_name: b2FileName,
      file_url: fileUrl,
      spectral_balance: spectralBalance,
      notes: notes || `Reference track for ${genre}`,
    });

    return NextResponse.json({
      success: true,
      reference: ref,
      spectral_balance: spectralBalance,
    });
  } catch (err: any) {
    console.error("[references] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
