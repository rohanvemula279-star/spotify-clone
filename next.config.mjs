/** @type {import('next').NextConfig} */
const nextConfig = {
  // Runs as a normal Next.js server app (e.g. Vercel). This is required so
  // the /app/api/saavn/* proxy routes work — JioSaavn blocks direct browser
  // calls (no CORS), so search + audio resolution go through our backend.
  //
  // The Android APK (Capacitor) loads the deployed site URL rather than a
  // bundled static build; set capacitor.config server.url when packaging.
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**.saavncdn.com" },
      { protocol: "https", hostname: "**.jiosaavn.com" },
    ],
  },
};

export default nextConfig;
