// app/api/photos/route.js
import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import r2 from "@/lib/r2";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder");

  if (!folder) {
    return NextResponse.json({ error: "Nama folder diperlukan" }, { status: 400 });
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: folder + "/", 
    });

    const data = await r2.send(command);

    if (!data.Contents) {
      return NextResponse.json({ photos: [] });
    }

    // FILTER: Hanya ambil file gambar, abaikan file system (.sys)
    const photos = data.Contents
      .filter((file) => !file.Key.endsWith(".sys")) // <--- RAHSIA KITA DI SINI
      .map((file) => {
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