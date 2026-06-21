import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.flowz.app",
  appName: "Flowz",
  webDir: "out",
  android: {
    allowMixedContent: true,
  },
};

export default config;
