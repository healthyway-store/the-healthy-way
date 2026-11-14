/**
 * GET /api/download?token=<signed token>
 *
 * Streams the purchased PDF from a private KV namespace. The token must be
 * a valid HMAC signed by this server and must not be expired — so the file
 * can't be accessed by guessing URLs.
 */
import { hmacSHA256 } from "../lib/payfast.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || !env.FILES) {
    return text("Missing token or store not configured.", 400);
  }

  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return text("Malformed token.", 400);

  // Verify HMAC
  const expected = await hmacSHA256(env.DOWNLOAD_SECRET || "CHANGE_ME", encoded);
  if (!timingSafeEqual(expected, sig)) return text("Invalid token.", 403);

  // Verify expiry
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encoded));
  } catch {
    return text("Malformed token.", 400);
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return text("This download link has expired. Please contact support.", 410);
  }

  // Serve the file from private KV
  const file = await env.FILES.get("file:" + payload.product, { type: "arrayBuffer" });
  if (!file) {
    return text("File not uploaded yet. Please contact support.", 404);
  }

  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="' + payload.product + '.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}

/** Constant-time-ish string comparison to avoid leaking the token check. */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function base64UrlDecode(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function text(message, status) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain" } });
}
