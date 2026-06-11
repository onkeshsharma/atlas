// M5 — Vitest runs outside Next's env loader; integration tests need the
// real Neon DATABASE_URL from .env.local.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
