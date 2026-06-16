/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML export — produces a plain `out/` folder with no server.
  // This is what gets bundled into the Android app (Capacitor) and what
  // can be opened directly / hosted on any static host.
  output: "export",
  images: {
    // No Next.js image optimization server in a static export.
    unoptimized: true,
  },
  // Helps static hosting + Capacitor's file:// WebView resolve routes.
  trailingSlash: true,
};

export default nextConfig;
