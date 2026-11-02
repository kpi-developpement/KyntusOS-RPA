import type { NextConfig } from "next";

/**
 * NEXUS — one codebase, two build targets.
 *
 *   NEXUS_TARGET=desktop   ->  output: "export"      ->  ./out        (Tauri bundles this)
 *   (default / no env var) ->  output: "standalone"  ->  ./.next      (web Orchestrator server)
 *
 * In Next 16 the static export is written into `distDir`, whose default is
 * `out` for output:"export" and `.next` for output:"standalone".
 * So the two targets never overwrite each other and tauri.conf.json can keep
 * pointing at "../out".
 */
const isDesktop = process.env.NEXUS_TARGET === "desktop";

const nextConfig: NextConfig = isDesktop
  ? {
      output: "export",
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      output: "standalone",
    };

export default nextConfig;