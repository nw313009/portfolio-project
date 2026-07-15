import type { NextConfig } from "next";

// During `next dev`, generate the typed content layer once and keep it in sync
// with content edits. For `next build`, the `prebuild` npm script generates it
// deterministically before compilation (see package.json).
const isDev = process.argv.includes("dev");
if (isDev && !process.env.VELITE_STARTED) {
  process.env.VELITE_STARTED = "1";
  void import("velite").then((m) => m.build({ watch: true, clean: false }));
}

const nextConfig: NextConfig = {
  // Keep `ws` (used by the `neon-serverless` Pool writer for event/admin
  // writes) OUT of the server bundle. Bundling it mangles its buffer-mask
  // fallback (`TypeError: b.mask is not a function` at runtime under
  // `next start`); loading it as an external Node module preserves the
  // fallback. The `neon-http` read driver is unaffected.
  serverExternalPackages: ["ws"],
};

export default nextConfig;
