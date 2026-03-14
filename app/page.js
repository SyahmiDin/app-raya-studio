"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import Script from "next/script";

export default function Home() {
    const [services, setServices] = useState([]);

    // State untuk Modal Login (Kekal)
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    // --- 2. CONFIG ANIMASI FRAMER MOTION ---
    const textTitle = "MEMORI AIDILFITRI";
    const letters = textTitle.split("");

    // --- 3. CONFIG GAMBAR & CAROUSEL ---
    const galleryImages = ["/bd1.jpeg", "/bd2.jpeg", "/bd6.jpeg", "/bd7.jpeg"];
    const testimoniImages = [
        "/backdrop/bd1.jpeg",
        "/backdrop/bd2.jpeg",
        "/backdrop/backdrop1.jpeg",
        "/backdrop/backdrop2.jpeg",
        "/backdrop/backdrop3.jpeg",
        "/backdrop/backdrop4.jpeg",
        "/backdrop/backdrop5.jpeg",
        "/backdrop/backdrop6.jpeg",
        "/backdrop/backdrop7.jpg",
        "/backdrop/backdrop8.jpg",
        "/backdrop/backdrop9.jpg",
        "/backdrop/backdrop10.jpg",
        "/backdrop/backdrop11.jpg",
        "/backdrop/backdrop12.jpg",
        "/backdrop/backdrop13.jpg",
        "/backdrop/backdrop14.jpg",
    ];

    const [imageIndex, setImageIndex] = useState(0);
    const [direction, setDirection] = useState(0); // 1 = kanan, -1 = kiri

    // Fungsi Next/Prev
    const paginate = (newDirection) => {
        setDirection(newDirection);
        setImageIndex((prev) => {
            let nextIndex = prev + newDirection;
            // Logic loop: Kalau lebih, balik ke 0. Kalau kurang, pergi ke last.
            if (nextIndex < 0) nextIndex = mobileImages.length - 1;
            if (nextIndex >= mobileImages.length) nextIndex = 0;
            return nextIndex;
        });
    };

    // Logic untuk dapatkan index kiri dan kanan secara circular
    const getIndex = (i) => {
        return (i + mobileImages.length) % mobileImages.length;
    };

    // --- STATE & CONFIG BACKGROUND BERTUKAR ---

    // 1. Gambar Landscape (Desktop/Tablet)
    const desktopImages = [
        "/backdrop/backdrop3.jpeg",
        "/backdrop/backdrop1.jpeg",
        "/backdrop/backdrop2.jpeg",
        "/backdrop/backdrop4.jpeg",
        "/backdrop/backdrop5.jpeg",
        "/backdrop/backdrop6.jpeg",
    ];

    // 2. Gambar Portrait
    const mobileImages = [
        "/backdrop/mb1.jpg",
        "/backdrop/mb2.jpg",
        "/backdrop/mb3.jpg",
        "/backdrop/mb4.jpg",
        "/backdrop/mb5.jpg",
        "/backdrop/mb6.jpg",
        "/backdrop/mb7.jpg",
        "/backdrop/mb8.jpg",
        "/backdrop/mb9.jpg",
    ];

    const [bgIndex, setBgIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            // Kita guna index infiniti, nanti kita guna % (modulo) untuk loop
            setBgIndex((prev) => prev + 1);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    // --- STATE & CONFIG BACKGROUND BERTUKAR TAMAT---

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.04, delayChildren: 0.1 },
        },
    };

    const letterVariants = {
        hidden: { opacity: 0, x: -5 },
        visible: {
            opacity: 1,
            x: 0,
            transition: { type: "spring", damping: 1, stiffness: 150 },
        },
    };
    // --------------------------------------

    useEffect(() => {
        async function fetchServices() {
            const { data } = await supabase
                .from("services")
                .select("*")
                .order("price");
            if (data) {
                const publicServices = data.filter(
                    (s) => !s.name.toUpperCase().includes("BLOCK"),
                );
                setServices(publicServices);
            }
        }
        fetchServices();
    }, []);

    // --- FUNCTION LOGIN ---
    const handleLogin = (e) => {
        e.preventDefault();
        if (username === "admin" && password === "abg2026") {
            document.cookie = "admin_session=true; path=/; max-age=3600";
            setIsLoginOpen(false);
            router.push("/admin");
        } else {
            setError("Username atau Password salah!");
        }
    };

    // --- CONFIG MARQUEE (GAMBAR BERGERAK) ---
    // Menggabungkan gambar sedia ada menjadi satu senarai yang panjang,
    // dan menggandakannya supaya tiada cacat cela bila ia loop.
    const allMarqueeImages = [...testimoniImages, ...desktopImages];
    const marqueeImagesLoop = [...allMarqueeImages, ...allMarqueeImages];

    return (
        <div className="relative min-h-screen flex flex-col font-sans">
            <style>{`
  @keyframes pendulumSwing {
    0%, 100% { transform: rotate(8deg); }
    50% { transform: rotate(-8deg); }
  }
  .animate-pendulum {
    transform-origin: top center;
    animation: pendulumSwing 2s ease-in-out infinite;
  }
  
  /* --- KEYFRAMES BARU UNTUK GAMBAR BERGERAK --- */
  @keyframes scrollLeft {
    0% { transform: translateX(0); }
    100% { transform: translateX(-10%); }
  }
  @keyframes scrollRight {
    0% { transform: translateX(-10%); }
    100% { transform: translateX(0); }
  }
  .animate-scroll-left {
    animation: scrollLeft 40s linear infinite;
  }
  .animate-scroll-right {
    animation: scrollRight 40s linear infinite;
  }
`}</style>

            {/* BACKGROUND - Updated: Bertukar dengan dissolve */}
            {/* BACKGROUND WRAPPER */}
            <div className="fixed inset-0 z-0 bg-black">
                {/* A. VERSION DESKTOP (Landscape) - Hidden on Mobile */}
                <div className="hidden md:block w-full h-full absolute inset-0">
                    <AnimatePresence initial={false}>
                        <motion.img
                            key={bgIndex}
                            // Logic loop: index % jumlah gambar desktop
                            src={desktopImages[bgIndex % desktopImages.length]}
                            alt="Background Desktop"
                            className="absolute inset-0 w-full h-full object-cover"
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                                opacity: { duration: 1.5, ease: "easeInOut" },
                                scale: { duration: 6, ease: "linear" },
                            }}
                        />
                    </AnimatePresence>
                </div>

                {/* B. VERSION MOBILE (Portrait) - Hidden on Desktop */}
                <div className="block md:hidden w-full h-full absolute inset-0">
                    <AnimatePresence initial={false}>
                        <motion.img
                            key={bgIndex}
                            // Logic loop: index % jumlah gambar mobile
                            src={mobileImages[bgIndex % mobileImages.length]}
                            alt="Background Mobile"
                            className="absolute inset-0 w-full h-full object-cover"
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                                opacity: { duration: 1.5, ease: "easeInOut" },
                                scale: { duration: 6, ease: "linear" },
                            }}
                        />
                    </AnimatePresence>
                </div>

                {/* Overlay Gelap (Kekal) */}
                <div className="absolute inset-0 bg-black/50 z-10"></div>
            </div>

            {/* NAVBAR */}
            <nav className="relative z-40 w-full max-w-7xl mx-auto p-4 md:p-6 flex justify-between items-center text-white">
                <div className="text-lg md:text-xl font-bold tracking-widest uppercase text-center w-full md:text-left md:w-auto">
                    Studio <span className="text-[#412986]">ABG Raya</span> 2026
                </div>
            </nav>

            {/* MAIN CONTENT - Ubah padding supaya mesra mobile (px-4) */}
            <main className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-4 md:px-0 py-8 md:py-12">
                {/* --- TAJUK & SUBTAJUK DENGAN MOTION --- */}
                <motion.h1
                    className="relative z-10 text-3xl sm:text-5xl md:text-7xl font-black text-[#f6f6f6] mb-6 drop-shadow-lg flex items-start justify-center gap-2 md:gap-6 overflow-hidden py-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Ketupat Kiri - Responsive Size */}
                    <img
                        src="ketupat5.png"
                        alt="Ketupat"
                        className="w-10 h-10 sm:w-20 sm:h-20 md:w-32 md:h-32 mt-[-5px] md:mt-[-20px] animate-pendulum object-contain"
                    />

                    {/* Teks Huruf per Huruf - DIKEMASKINI */}
                    <span className="flex flex-wrap justify-center items-center">
                        {letters.map((char, index) =>
                            char === " " ? (
                                // LOGIC UBAHAN:
                                // w-full pada mobile: Memaksa perkataan seterusnya ke baris baru
                                // md:w-[1rem]: Pada desktop, ia kembali menjadi jarak biasa
                                <span
                                    key={index}
                                    className="w-full h-0 md:w-[1rem] md:h-auto block md:inline-block"
                                ></span>
                            ) : (
                                <motion.span
                                    key={index}
                                    variants={letterVariants}
                                    className="inline-block"
                                >
                                    {char}
                                </motion.span>
                            ),
                        )}
                    </span>

                    {/* Ketupat Kanan - Responsive Size */}
                    <img
                        src="ketupat5.png"
                        alt="Ketupat"
                        className="w-10 h-10 sm:w-20 sm:h-20 md:w-32 md:h-32 mt-[-5px] md:mt-[-20px] animate-pendulum object-contain"
                    />
                </motion.h1>

                {/* 3. Paragraf Responsive */}
                <motion.p
                    className="text-gray-200 text-sm sm:text-lg md:text-xl max-w-xs sm:max-w-2xl mx-auto mb-12 drop-shadow-md px-2 text-center leading-relaxed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 0.8 }}
                >
                    Gambar raya berkualiti studio profesional. Cepat, selesa,
                    dan harga mampu milik.
                </motion.p>

                <style>{`
          @keyframes customFadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-custom-fade {
            opacity: 0; 
            animation: customFadeIn 0.8s ease-out forwards;
          }
        `}</style>

                {/* PAKEJ LIST */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
                    {services.length === 0
                        ? /* Loading State */
                          [1, 2, 3].map((i) => (
                              <div
                                  key={i}
                                  className="bg-white/10 h-40 rounded-xl animate-pulse"
                              ></div>
                          ))
                        : /* Data Loaded */
                          services.map((service, index) => {
                              // Logic Kiraan Harga Asal (Display Sahaja)
                              const originalPrice = Math.ceil(
                                  service.price / 0.9,
                              );

                              return (
                                  <div
                                      key={service.id}
                                      className="animate-custom-fade flex flex-col justify-between bg-black/50 backdrop-blur-md border border-white/20 p-6 rounded-2xl text-white hover:bg-black/70 transition duration-300 relative overflow-hidden shadow-xl"
                                      style={{
                                          animationDelay: `${index * 200}ms`,
                                      }}
                                  >
                                      {/* Badge Early Bird
                                      <div className="absolute top-0 right-0 bg-[#412986] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider shadow-md">
                                          Early Bird
                                      </div> */}

                                      <div>
                                          <h3 className="font-extrabold text-xl mb-2 text-gray-100 tracking-wide">
                                              {service.name}
                                          </h3>

                                          {/* --- HARGA SECTION --- */}
                                          <div className="flex flex-col mb-4 bg-black/20 p-3 rounded-lg border border-white/5">
                                              <div className="flex items-center gap-2 justify-center">
                                                  <span className="text-gray-400 line-through text-sm decoration-red-500/70 decoration-2">
                                                      RM{originalPrice}
                                                  </span>
                                                  <span className="bg-[#412986] text-white text-[10px] font-bold px-1.5 rounded">
                                                      -10% OFF
                                                  </span>
                                              </div>
                                              <div className="text-4xl font-black text-white drop-shadow-sm mt-1">
                                                  RM{service.price}
                                              </div>
                                          </div>

                                          <p className="text-sm text-gray-200 mb-4 leading-relaxed opacity-90">
                                              {service.description}
                                          </p>

                                          <div className="flex justify-center mb-6">
                                              <div className="text-xs bg-white/10 border border-white/20 inline-flex items-center gap-1 px-3 py-1 rounded-full text-gray-200 font-medium">
                                                  ⏱️ {service.duration_minutes}{" "}
                                                  Minit/Sesi
                                              </div>
                                          </div>
                                          <div className="flex justify-center mb-6">
                                              {/* Ubah px-15 kepada px-6 supaya muat mobile, dan tambah w-full */}
                                              <div className="text-lg bg-black/20 inline-flex items-center justify-center w-full px-6 py-5 rounded-lg text-gray-200 font-medium text-left">
                                                  <div>
                                                      - ⁠Unlimited Shot
                                                      <br /> - ⁠Posing Guidance
                                                      <br /> - ⁠All edited
                                                      photos
                                                      <br /> - ⁠Send via cloud
                                                  </div>
                                              </div>
                                          </div>
                                      </div>

                                      {/* --- BUTTON KHAS PADA SETIAP CARD --- */}
                                      <Link
                                          href={`/booking?package=${service.id}`}
                                          className="w-full py-3 rounded-xl bg-[#412986] text-white font-bold hover:bg-[#301F63] hover:scale-105 transition transform shadow-lg flex items-center justify-center gap-2 group"
                                      >
                                          <span>TEMPAH SEKARANG</span>
                                          <span className="group-hover:translate-x-3 transition-transform">
                                              ➜
                                          </span>
                                      </Link>
                                  </div>
                              );
                          })}
                </div>

                {/* Promo Text - Ubah padding supaya text tak terhimpit */}
                <div className="max-w-6xl w-full bg-black/50 py-4 px-4 md:px-12 rounded-xl mb-4 animate-fade-in-up delay-100 border border-white/10">
                    <p className="text-white text-base md:text-xl drop-shadow-md italic animate-pulse">
                        Harga promosi ini sah untuk tempahan dibuat pada bulan Ramadan
                    </p>
                </div>

                {/* GOOGLE MAPS / LOCAL SEO */}
                <Script
                    id="local-business-schema"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "PhotographyStudio",
                            name: "Studio ABG Raya",
                            image: "https://studioabg.vercel.app/bd2.jpeg", // URL Logo
                            telephone: "+60128384048",
                            url: "https://studioabg.vercel.app",
                            address: {
                                "@type": "PostalAddress",
                                streetAddress: "60-2, Jalan Timur 6/2D",
                                addressLocality: "Bandar Baru Enstek",
                                addressRegion: "Negeri Sembilan",
                                postalCode: "71760",
                                addressCountry: "MY",
                            },
                            geo: {
                                "@type": "GeoCoordinates",
                                latitude: 2.747843111722812, //2.747853828222511, 101.76759079820556
                                longitude: 101.76746205217971,
                            },
                            openingHoursSpecification: {
                                "@type": "OpeningHoursSpecification",
                                dayOfWeek: [
                                    "Monday",
                                    "Tuesday",
                                    "Wednesday",
                                    "Thursday",
                                    "Friday",
                                    "Saturday",
                                    "Sunday",
                                ],
                                opens: "10:00",
                                closes: "23:00",
                            },
                            priceRange: "RM100 - RM200",
                        }),
                    }}
                />

                {/* PAKSA GOOGLE TUKAR NAMA 'VERCEL' KEPADA 'STUDIO ABG' */}
                <Script
                    id="website-schema"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "WebSite",
                            name: "Studio ABG",
                            alternateName: "Studio ABG Raya",
                            url: "https://studioabg.vercel.app/",
                        }),
                    }}
                />
            </main>

            {/* --- INTERACTIVE CENTER-MODE CAROUSEL (UPDATED: PORTRAIT) --- */}
            <section className="relative w-screen left-1/2 -translate-x-1/2 py-2 bg-black/70 border-t border-gray-800 overflow-hidden flex flex-col items-center justify-center">
                {/* Tajuk */}
                <div className="mb-4 text-center z-10 px-4 mt-10">
                    <h3 className="text-2xl font-bold text-white tracking-[0.2em] uppercase drop-shadow-lg">
                        BACKDROP RAYA 2026
                    </h3>
                </div>

                {/* --- MARQUEE GAMBAR --- */}
                <section className="relative w-screen left-1/2 -translate-x-1/2 py-8 bg-black/30 border-t border-white/5 overflow-hidden flex flex-col gap-4 z-10">
                    {/* Baris Atas: Bergerak ke Kanan (Guna scroll-right) */}
                    <div className="flex w-full overflow-hidden">
                        <div className="flex w-max animate-scroll-right gap-4 px-2">
                            {marqueeImagesLoop.map((src, idx) => (
                                <div
                                    key={`top-${idx}`}
                                    className="w-85 h-60 md:w-120 md:h-80 flex-shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-lg"
                                >
                                    <img
                                        src={src}
                                        alt={`Marquee Top ${idx}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Baris Bawah: Bergerak ke Kiri (Guna scroll-left) */}
                    <div className="flex w-full overflow-hidden">
                        {/* Reverse array untuk baris bawah supaya susunan gambar nampak rawak sedikit berbanding atas */}
                        <div className="flex w-max animate-scroll-left gap-4 px-2">
                            {[...marqueeImagesLoop]
                                .reverse()
                                .map((src, idx) => (
                                    <div
                                        key={`bottom-${idx}`}
                                        className="w-85 h-60 md:w-120 md:h-80 flex-shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-lg"
                                    >
                                        <img
                                            src={src}
                                            alt={`Marquee Bottom ${idx}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                        </div>
                    </div>
                </section>
                {/* --- MARQUE END --- */}

                {/* CAROUSEL CONTAINER (DIKEMASKINI: PORTRAIT) */}
                <div className="relative w-full max-w-7xl h-[450px] md:h-[600px] flex items-center justify-center perspective-1000 mt-8 mb-4">
                    {[-1, 0, 1].map((offset) => {
                        const index = getIndex(imageIndex + offset);
                        const isCenter = offset === 0;

                        return (
                            <motion.div
                                key={index}
                                layout
                                custom={offset}
                                initial={false}
                                animate={{
                                    scale: isCenter ? 1 : 0.85,
                                    opacity: isCenter ? 1 : 0.6,
                                    // Jarak ditambah ke 95% supaya tidak terlalu menindih sebab gambar kini lebih tirus
                                    x: `${offset * 95}%`,
                                    zIndex: isCenter ? 10 : 5,
                                    filter: isCenter
                                        ? "brightness(1)"
                                        : "brightness(0.3)",
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 30,
                                }}
                                drag={isCenter ? "x" : false}
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.2}
                                onDragEnd={(e, { offset, velocity }) => {
                                    const swipe = offset.x;
                                    if (swipe < -50) {
                                        paginate(1);
                                    } else if (swipe > 50) {
                                        paginate(-1);
                                    }
                                }}
                                onClick={() => {
                                    if (offset !== 0) paginate(offset);
                                }}
                                // aspect-[3/4] memaksa nisbah portrait
                                // w-[60%] & w-[30%] mengecilkan sedikit kotak untuk nampak seimbang di mobile/desktop
                                className={`absolute w-[70%] sm:w-[45%] md:w-[30%] aspect-[5/7] rounded-2xl shadow-2xl overflow-hidden cursor-pointer border-[3px] ${isCenter ? "border-white/50" : "border-transparent"}`}
                            >
                                <img
                                    src={mobileImages[index]}
                                    alt="Galeri"
                                    className="w-full h-full object-cover pointer-events-none"
                                />
                            </motion.div>
                        );
                    })}
                </div>

                {/* BUTTON CONTROL */}
                <div className="flex gap-6 mb-6 z-10 mt-4">
                    <button
                        onClick={() => paginate(-1)}
                        className="p-4 rounded-full bg-black/40 hover:bg-white/20 text-white hover:cursor-pointer transition backdrop-blur-md border border-white/10"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <button
                        onClick={() => paginate(1)}
                        className="p-4 rounded-full bg-black/40 hover:bg-white/20 text-white hover:cursor-pointer transition backdrop-blur-md border border-white/10"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </button>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="bg-gray-900 z-40 text-white py-10 text-center border-t border-gray-800">
                <div className="container mx-auto px-4">
                    {/* TAJUK */}
                    <h3 className="font-black text-xl md:text-2xl mb-4 tracking-widest text-white">
                        STUDIO ABG 2026
                    </h3>

                    {/* ALAMAT (BOLEH KLIK) */}
                    <div className="flex justify-center mb-6">
                        <a
                            href="https://www.google.com/maps/search/?api=1&query=60-2,+Jalan+Timur+6/2D,+Bandar+Baru+Enstek,+71760+Nilai,+Negeri+Sembilan"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col md:flex-row items-center gap-2 text-gray-400 hover:text-[#a78bfa] transition-colors duration-300"
                        >
                            {/* Icon Location */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 group-hover:animate-bounce"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>

                            {/* Teks Alamat */}
                            <p className="text-sm md:text-base leading-relaxed max-w-xs md:max-w-none">
                                60-2, Jalan Timur 6/2D, Bandar Baru Enstek,
                                <br className="md:hidden" /> 71760 Nilai, Negeri
                                Sembilan
                            </p>
                        </a>
                    </div>

                    {/* MEDIA SOSIAL (INSTAGRAM & TIKTOK) */}
                    <div className="flex justify-center items-center gap-16 mb-6 text-gray-400">
                        {/* Instagram */}
                        <a
                            href="https://www.instagram.com/abgstudio25?igsh=MTJxZGRoejI1eHMxcA=="
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#E1306C] transition-colors duration-300"
                            aria-label="Instagram"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect
                                    x="2"
                                    y="2"
                                    width="20"
                                    height="20"
                                    rx="5"
                                    ry="5"
                                ></rect>
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                <line
                                    x1="17.5"
                                    y1="6.5"
                                    x2="17.51"
                                    y2="6.5"
                                ></line>
                            </svg>
                        </a>

                        {/* TikTok */}
                        <a
                            href="https://www.tiktok.com/@abgstudio25?_r=1&_t=ZS-94BKJ97hMbC"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white transition-colors duration-300"
                            aria-label="TikTok"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="22"
                                height="22"
                                viewBox="0 0 448 512"
                                fill="currentColor"
                            >
                                <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
                            </svg>
                        </a>
                    </div>

                    {/* COPYRIGHT */}
                    <p className="text-gray-600 text-xs tracking-wider">
                        Hak Cipta Terpelihara © 2026 Al Bayan Global.
                    </p>
                </div>
            </footer>

            {/* --- FLOATING WHATSAPP BUTTON --- */}
            <a
                href="https://wa.me/60129585260?text=Hai!%20saya%20nak%20tanya%20berkenaan%20pakej%20Studio%20Raya%20ABG"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-3 md:p-4 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.5)] hover:scale-110 transition-transform duration-300 flex items-center justify-center group"
                aria-label="Tanya di WhatsApp"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                >
                    <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c-.003 1.396.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
                </svg>

                {/* Tooltip Hover */}
                <span className="absolute right-16 bg-white text-gray-800 px-3 py-1.5 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md whitespace-nowrap pointer-events-none">
                    Hubungi Kami di WhatsApp!
                </span>
            </a>

            {/* --- LOGIN MODAL (Tidak Berubah) --- */}
            {isLoginOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsLoginOpen(false)}
                    ></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-sm transform transition-all scale-100">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                            Admin Access 🔐
                        </h2>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Username"
                            />
                            <input
                                type="password"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                            />
                            {error && (
                                <p className="text-red-500 text-sm text-center font-bold">
                                    {error}
                                </p>
                            )}
                            <button
                                type="submit"
                                className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition"
                            >
                                Log Masuk
                            </button>
                        </form>
                        <button
                            onClick={() => setIsLoginOpen(false)}
                            className="mt-4 w-full text-center text-gray-500 text-sm hover:text-gray-800"
                        >
                            Batal / Tutup
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}