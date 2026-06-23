/**
 * SSRF guard utilities.
 *
 * validateExternalUrl  – block private IPs and unapproved domains on OUTBOUND calls
 * sanitizeOutputUrl    – strip unsafe URLs returned by external AI before sending
 *                        to clients
 */

import { URL } from "url";
import * as net from "net";

// ── Allowlist ─────────────────────────────────────────────────────────────────
// Only domains that this backend is explicitly expected to call.
const ALLOWED_DOMAINS = new Set([
  "api.openai.com",
  "openai.azure.com",
  "stripe.com",
  "api.stripe.com",
  "hooks.stripe.com",
]);

// ── Private IP patterns ───────────────────────────────────────────────────────
const PRIVATE_RANGES: RegExp[] = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export class SSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SSRFError";
  }
}

function isPrivateIp(hostname: string): boolean {
  if (!net.isIP(hostname)) return false;
  return PRIVATE_RANGES.some((re) => re.test(hostname));
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h.endsWith(".internal") ||
    h.endsWith(".local") ||
    h.endsWith(".localhost")
  );
}

function isDomainAllowed(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (ALLOWED_DOMAINS.has(h)) return true;
  for (const domain of ALLOWED_DOMAINS) {
    if (h.endsWith(`.${domain}`)) return true;
  }
  return false;
}

/**
 * Validate a URL before this server makes an outbound call to it.
 * Throws SSRFError if the URL is not safe.
 */
export function validateExternalUrl(urlString: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new SSRFError(`Malformed URL: ${urlString}`);
  }

  if (parsed.protocol !== "https:") {
    throw new SSRFError("Only HTTPS outbound calls are permitted.");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (isBlockedHostname(hostname)) {
    throw new SSRFError(`Blocked internal hostname: ${hostname}`);
  }

  if (isPrivateIp(hostname)) {
    throw new SSRFError(`Blocked private IP address: ${hostname}`);
  }

  if (!isDomainAllowed(hostname)) {
    throw new SSRFError(`Domain not in outbound allowlist: ${hostname}`);
  }

  return parsed;
}

/**
 * Sanitize a URL from AI-generated output before including it in API responses.
 * Returns undefined if the URL is unsafe or malformed.
 */
export function sanitizeOutputUrl(urlString: string | undefined): string | undefined {
  if (!urlString || typeof urlString !== "string") return undefined;

  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return undefined;
  }

  if (parsed.protocol !== "https:") return undefined;

  const hostname = parsed.hostname.toLowerCase();
  if (isBlockedHostname(hostname) || isPrivateIp(hostname)) return undefined;

  return urlString;
}
