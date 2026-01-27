// app/api/photos/route.js
import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import r2 from "@/lib/r2";

export async function GET(request) {
  // Kita ambil nama folder dari URL (contoh: ?folder=ahmad-albureng)
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder");

  if (!folder) {
    return NextResponse.json({ error: "Nama folder diperlukan" }, { status: 400 });
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: folder + "/", // Kita filter ikut nama folder sahaja
    });

    const data = await r2.send(command);

    // Kalau folder kosong / tak wujud
    if (!data.Contents) {
      return NextResponse.json({ photos: [] });
    }

    // Kita format data supaya frontend senang baca
    const photos = data.Contents.map((file) => {
        return {
            key: file.Key,
            url: `${process.env.R2_PUBLIC_DOMAIN}/${file.Key}`,
            lastModified: file.LastModified
        };
    });

    return NextResponse.json({ photos });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal ambil senarai gambar" }, { status: 500 });
  }
}