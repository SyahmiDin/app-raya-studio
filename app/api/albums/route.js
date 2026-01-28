// app/api/albums/route.js
import { NextResponse } from "next/server";
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import r2 from "@/lib/r2";

// 1. GET: Dapatkan senarai semua album + PIN + Jumlah Gambar
export async function GET() {
  try {
    // A. Cari semua "Folder" (Prefixes)
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Delimiter: "/", // Ini trik supaya S3 groupkan ikut folder
    });

    const data = await r2.send(command);
    const prefixes = data.CommonPrefixes || [];

    // B. Loop setiap folder untuk cari Info Detail (PIN & Count)
    const albums = await Promise.all(
      prefixes.map(async (prefix) => {
        const folderName = prefix.Prefix.replace("/", ""); // Buang tanda /
        
        // Scan isi dalam folder tu
        const folderCmd = new ListObjectsV2Command({
          Bucket: process.env.R2_BUCKET_NAME,
          Prefix: prefix.Prefix,
        });
        
        const folderData = await r2.send(folderCmd);
        const contents = folderData.Contents || [];

        // Cari fail kunci (lock-xxxx.sys)
        const lockFile = contents.find((item) => item.Key.includes("lock-") && item.Key.endsWith(".sys"));
        
        // Extract PIN dari nama fail (cth: folder/lock-1234.sys -> 1234)
        let pin = "Tiada PIN";
        if (lockFile) {
            const match = lockFile.Key.match(/lock-(\d+)\.sys/);
            if (match) pin = match[1];
        }

        // Kira gambar (tolak 1 fail kunci)
        const imageCount = contents.filter(c => !c.Key.endsWith(".sys")).length;

        return {
          name: folderName,
          pin: pin,
          count: imageCount,
        };
      })
    );

    return NextResponse.json({ albums });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal load album" }, { status: 500 });
  }
}

// 2. DELETE: Buang satu folder dan semua isinya
export async function DELETE(request) {
  try {
    const { folderName } = await request.json();

    if (!folderName) return NextResponse.json({ error: "Nama folder wajib" }, { status: 400 });

    // A. List semua fail dalam folder tu
    const listCmd = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        Prefix: folderName + "/",
    });
    const listData = await r2.send(listCmd);

    if (listData.Contents && listData.Contents.length > 0) {
        // B. Prepare senarai fail untuk dibuang
        const objectsToDelete = listData.Contents.map((file) => ({ Key: file.Key }));

        // C. Hapus fail
        const deleteCmd = new DeleteObjectsCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Delete: { Objects: objectsToDelete },
        });
        await r2.send(deleteCmd);
    }

    return NextResponse.json({ success: true, message: `Album ${folderName} dipadam.` });

  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Gagal padam folder" }, { status: 500 });
  }
}