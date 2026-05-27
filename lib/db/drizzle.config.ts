import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

config({ path: path.join(repoRoot, ".env.local") });
config({ path: path.join(repoRoot, ".env") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Set it in the repo root .env.local (Supabase → Database → Connection string URI).",
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
