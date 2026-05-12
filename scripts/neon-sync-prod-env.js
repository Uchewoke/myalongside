#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const text = fs.readFileSync(filePath, "utf8");
  const out = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    out[key] = value;
  }

  return out;
}

const root = process.cwd();
const neonEnvPath = path.join(root, ".env.neon");
const rootEnvPath = path.join(root, ".env");
const outPath = path.join(root, ".env.production.local");

if (!fs.existsSync(neonEnvPath)) {
  console.error("Missing .env.neon. Create it from .env.neon.example first.");
  process.exit(1);
}

const neon = readEnvFile(neonEnvPath);
const rootEnv = readEnvFile(rootEnvPath);

const dbUrl = neon.NEON_DATABASE_URL_PROD;
if (!dbUrl) {
  console.error("NEON_DATABASE_URL_PROD is missing in .env.neon");
  process.exit(1);
}

const apiBase =
  rootEnv.NEXT_PUBLIC_API_BASE || "https://api.myalongside.com/api";
const webUrl = rootEnv.WEB_URL || "https://myalongside.com";
const adminUrl = rootEnv.ADMIN_URL || "https://admin.myalongside.com";

const lines = [
  "# Generated from .env.neon by scripts/neon-sync-prod-env.js",
  "# Do not commit this file.",
  `DATABASE_URL=${dbUrl}`,
  `NEXT_PUBLIC_API_BASE=${apiBase}`,
  `WEB_URL=${webUrl}`,
  `ADMIN_URL=${adminUrl}`,
  "",
];

fs.writeFileSync(outPath, lines.join("\n"), "utf8");

console.log("Created .env.production.local using NEON_DATABASE_URL_PROD");
console.log("Next step: npx vercel env add DATABASE_URL production < .env.production.local");
