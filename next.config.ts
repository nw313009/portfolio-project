import type { NextConfig } from "next";

// During `next dev`, generate the typed content layer once and keep it in sync
// with content edits. For `next build`, the `prebuild` npm script generates it
// deterministically before compilation (see package.json).
const isDev = process.argv.includes("dev");
if (isDev && !process.env.VELITE_STARTED) {
  process.env.VELITE_STARTED = "1";
  void import("velite").then((m) => m.build({ watch: true, clean: false }));
}

const nextConfig: NextConfig = {};

export default nextConfig;
