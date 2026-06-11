import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Spotify-ish palette
        base: "#121212",
        elevated: "#181818",
        highlight: "#1f1f1f",
        accent: "#1db954",
        muted: "#a7a7a7",
      },
    },
  },
  plugins: [],
};

export default config;
