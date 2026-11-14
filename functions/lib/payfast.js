/**
 * Shared PayFast helpers for Cloudflare Pages Functions.
 *
 * PayFast signs requests with an MD5 digest of the alphabetically sorted,
 * URL-encoded field values, joined with "&", with the passphrase appended.
 */

// PayFast process URLs
export const PAYFAST_PROCESS_URLS = {
  sandbox: "https://sandbox.payfast.co.za/eng/process",
  live: "https://www.payfast.co.za/eng/process",
};

export const PAYFAST_VALIDATE_URLS = {
  sandbox: "https://sandbox.payfast.co.za/eng/query/validate",
  live: "https://www.payfast.co.za/eng/query/validate",
};

export function payfastMode(env) {
  return env.PAYFAST_MODE === "live" ? "live" : "sandbox";
}

/** Generate an MD5 hex digest using Cloudflare Workers' non-standard MD5 support. */
export async function md5(str) {
  const buf = await crypto.subtle.digest("MD5", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Build the signature string exactly as PayFast expects:
 * sorted keys → urlencoded values → joined with "&" → passphrase appended.
 */
export function buildSignatureString(fields, passphrase) {
  const keys = Object.keys(fields).sort();
  const pairs = keys.map(
    (key) => key + "=" + encodeURIComponent(String(fields[key]).trim()).replace(/%20/g, "+")
  );
  let str = pairs.join("&");
  if (passphrase) str += "&passphrase=" + encodeURIComponent(passphrase.trim()).replace(/%20/g, "+");
  return str;
}

export async function payfastSignature(fields, passphrase) {
  return md5(buildSignatureString(fields, passphrase));
}

/** HMAC-SHA256 helper used to sign secure download links. */
export async function hmacSHA256(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The single source of truth for what a product costs (server side). */
export const CATALOGUE = {
  "clean-eating-28": { title: "The 28-Day Clean Eating Plan", price: "149.00" },
  "mindful-eating": { title: "A Beginner's Guide to Mindful Eating", price: "99.00" },
  "home-workout": { title: "The Home Workout Handbook", price: "129.00" },
  "sleep-reset": { title: "The Sleep Reset Protocol", price: "119.00" },
};
