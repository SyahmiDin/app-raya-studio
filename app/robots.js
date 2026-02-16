export default function robots() {
    const baseUrl = "https://studioabg.vercel.app";

    return {
        rules: {
            userAgent: "*", // Semua robot Google/Bing
            allow: "/", // Izin masuk semua page
            disallow: ["/admin/", "/api/"], // SEKAT page Admin & API (Penting!)
        },
        sitemap: `${baseUrl}/sitemap.xml`, // Peta website
    };
}
