// app/api/check-pin/route.js
import { NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import r2 from "@/lib/r2";

export async function POST(request) {
  try {
    const { folder, pin } = await request.json();

    if (!folder || !pin) {
        return NextResponse.json({ success: false, message: "Data tak lengkap" });
    }

    // Kunci yang kita cari
    const secretKey = `${folder}/lock-${pin}.sys`;
    
    // DEBUG: Tengok kat terminal VS Code dia cari apa
    console.log(`🔎 Checking PIN... Mencari fail: [${secretKey}] di dalam Bucket.`);

    const command = new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: secretKey,
    });

    await r2.send(command);

    console.log("✅ PIN Betul! Fail jumpa.");
    return NextResponse.json({ success: true });

  } catch (error) {
    console.log("❌ PIN Salah atau Fail tiada. Error:", error.name);
    // Kalau error 404 (NotFound), maksudnya PIN salah
    return NextResponse.json({ success: false, message: "PIN Salah" });
  }
}