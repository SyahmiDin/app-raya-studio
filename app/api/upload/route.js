import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import r2 from "@/lib/r2";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file"); // Kita akan hantar field nama "file" dari frontend
    const clientName = formData.get("clientName"); // Folder client

    if (!file) {
      return NextResponse.json({ error: "Tiada fail dikesan" }, { status: 400 });
    }

    // 1. Convert File kepada Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 2. Buat nama fail unik: "nama_client/tarikh-namafile.jpg"
    const fileName = `${clientName}/${Date.now()}-${file.name}`;

    // 3. Setup Command Upload
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    });

    // 4. Tembak ke R2
    await r2.send(command);

    // 5. Return Public URL
    const publicUrl = `${process.env.R2_PUBLIC_DOMAIN}/${fileName}`;

    return NextResponse.json({ success: true, url: publicUrl });

  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Gagal upload" }, { status: 500 });
  }
}