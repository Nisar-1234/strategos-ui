import { existsSync, readFileSync } from "fs";
import path from "path";
import type { NextConfig } from "next";

/**
 * When the UI lives at intelligence/strategos-ui/, load optional
 * intelligence/credentials/strategos-ui.env (gitignored) so NEXT_PUBLIC_* is set without committing secrets.
 * strategos-ui/.env.local still overrides if Next injects it later for the same keys.
 */
function loadParentCredentialsEnv(): void {
  const credPath = path.join(__dirname, "..", "credentials", "strategos-ui.env");
  if (!existsSync(credPath)) return;
  const text = readFileSync(credPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadParentCredentialsEnv();

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
