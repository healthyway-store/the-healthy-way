/**
 * GET /api/order?ref=<m_payment_id>
 *
 * Polled by the success page. Once the PayFast ITN has recorded the order as
 * COMPLETE, we return the status plus a signed, expiring download link so
 * only paying customers can get the file.
 */
import { hmacSHA256 } from "../lib/payfast.js";

const DOWNLOAD_LINK_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  if (!ref || !env.ORDERS) {
    return json({ status: "PENDING" });
  }

  const recordRaw = await env.ORDERS.get("order:" + ref);
  if (!recordRaw) {
    // ITN hasn't arrived yet — the page keeps polling.
    return json({ status: "PENDING" });
  }

  const order = JSON.parse(recordRaw);
  if (order.status !== "COMPLETE") {
    return json({ status: order.status });
  }

  const productId = await productIdFromTitle(order.product);
  if (!productId) {
    return json({ status: "COMPLETE", error: "Unknown product file." }, 500);
  }

  const token = await makeDownloadToken(env, productId, ref);
  return json({
    status: "COMPLETE",
    product: order.product,
    amount: order.amount,
    email: order.email,
    downloadUrl: "/api/download?token=" + token,
    expiresIn: DOWNLOAD_LINK_TTL_SECONDS,
  });
}

/**
 * Build a token: base64url(payload).hmac
 * The HMAC proves the token was created by this server; the "exp" claim
 * makes the link self-expire.
 */
async function makeDownloadToken(env, productId, ref) {
  const payload = {
    product: productId,
    ref,
    exp: Math.floor(Date.now() / 1000) + DOWNLOAD_LINK_TTL_SECONDS,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = await hmacSHA256(env.DOWNLOAD_SECRET || "CHANGE_ME", encoded);
  return encoded + "." + sig;
}

/** Map the item name PayFast sends back to our product id. */
async function productIdFromTitle(title) {
  const { CATALOGUE } = await import("../lib/payfast.js");
  const match = Object.entries(CATALOGUE).find(([, p]) => p.title === title);
  return match ? match[0] : null;
}

function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
