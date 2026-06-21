import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.flowz.app",
  appName: "Flowz",
  // The app has server-side API routes (/api/saavn/*), so it must be deployed
  // to a Node host (e.g. Vercel). The APK loads the deployed URL in a WebView.
  // Set FLOWZ_SERVER_URL before building, or edit this file with the live URL.
  // To bundle a static build instead, set server.url locally and remove it
  // from version control, or switch next.config.mjs back to output:"export".
  server: {
    url: process.env.FLOWZ_SERVER_URL || "http://localhost:3000",
    cleartext: true,
  },
};

export default config;
