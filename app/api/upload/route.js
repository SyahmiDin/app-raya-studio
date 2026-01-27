// app/api/upload/route.js
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import r2 from "@/lib/r2";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const clientName = formData.get("clientName");

    if (!file || !clientName) {
      return NextResponse.json({ error: "Fail diperlukan" }, { status: 400 });
    }

    // Convert file kepada Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // --- LOGIC PENENTUAN NAMA FAIL (PENTING!) ---
    let finalKey;
    
    if (file.name.endsWith(".sys")) {
      // KALAU FAIL KUNCI: Guna nama asal (cth: lock-1234.sys)
      // Supaya kita boleh cari balik nanti
      finalKey = `${clientName}/${file.name}`;
    } else {
      // KALAU GAMBAR BIASA: Tambah timestamp supaya tak overwrite
      // cth: keluarga-siti/1715000-gambar.jpg
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      finalKey = `${clientName}/${uniqueSuffix}-${file.name}`;
    }

    // Upload ke R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: finalKey,
      Body: buffer,
      ContentType: file.type,
    });

    await r2.send(command);

    return NextResponse.json({ 
      success: true, 
      url: `${process.env.R2_PUBLIC_DOMAIN}/${finalKey}` 
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Gagal upload" }, { status: 500 });
  }
}