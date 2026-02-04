import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");
  const filename = searchParams.get("filename") || "image.jpg";

  if (!imageUrl) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  try {
    // 1. Server fetch gambar dari R2 (Tiada isu CORS sebab server-to-server)
    const response = await fetch(imageUrl);

    if (!response.ok) throw new Error("Failed to fetch image");

    // 2. Convert kepada Blob/Buffer
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();

    // 3. Return balik kepada browser dengan header yang betul
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}