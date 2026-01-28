// app/api/upload-url/route.js
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import r2 from "@/lib/r2";

export async function POST(request) {
  try {
    const { filename, filetype, clientName } = await request.json();

    // Logic nama fail (Kekalkan .sys, tambah timestamp untuk gambar)
    let finalKey;
    if (filename.endsWith(".sys")) {
       finalKey = `${clientName}/${filename}`;
    } else {
       const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
       finalKey = `${clientName}/${uniqueSuffix}-${filename}`;
    }

    // Command untuk "Booking" tempat dalam R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: finalKey,
      ContentType: filetype,
    });

    // Generate link khas yang valid selama 60 saat je
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 60 });

    // Hantar link tu ke frontend
    return NextResponse.json({ 
        uploadUrl, 
        finalUrl: `${process.env.R2_PUBLIC_DOMAIN}/${finalKey}` 
    });

  } catch (error) {
    console.error("Error presigned url:", error);
    return NextResponse.json({ error: "Gagal dapatkan link upload" }, { status: 500 });
  }
}