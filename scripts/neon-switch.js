#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const target = process.argv[2];
const allowed = ["local", "staging", "prod"];

if (!allowed.includes(target)) {
  console.error("Usage: node scripts/neon-switch.js <local|staging|prod>");
  process.exit(1);
}

const root = process.cwd();
const neonPath = path.join(root, ".env.neon");
const envPath = path.join(root, ".env");

if (!fs.existsSync(neonPath)) {
  console.error("Missing .env.neon file. Create it from .env.neon.example");
  process.exit(1);
}

const neon = fs.readFileSync(neonPath, "utf8");
const key = `NEON_DATABASE_URL_${target.toUpperCase()}`;
const match = neon.match(new RegExp(`^${key}=(.*)$`, "m"));

if (!match) {
  console.error(`Could not find ${key} in .env.neon`);
  process.exit(1);
}

const url = match[1].trim();
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

if (/^DATABASE_URL=/m.test(env)) {
  env = env.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${url}`);
} else {
  env = `${env}\nDATABASE_URL=${url}\n`.trimStart();
}

fs.writeFileSync(envPath, env.endsWith("\n") ? env : `${env}\n`, "utf8");
console.log(`DATABASE_URL switched to ${target} using ${key}.`);
