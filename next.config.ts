import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // M4 — Next 16 holds a per-distDir dev lock, so a second `next dev`
  // (Playwright's port-3100 webServer) can't start while the Owner's
  // dev server is up on :3000. The e2e runner sets ATLAS_E2E_DISTDIR to
  // sandbox its build output and sidestep the lock; normal dev/build
  // keep the default .next.
  distDir: process.env.ATLAS_E2E_DISTDIR || ".next",
};

export default nextConfig;
