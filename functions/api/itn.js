/**
 * POST /api/itn  — PayFast Instant Transaction Notification (ITN)
 *
 * This is PayFast's server-to-server webhook. Even if a buyer closes the
 * browser after paying, PayFast tells this endpoint the real payment status.
 * We:
 *   1. Verify the signature of the ITN data,
 *   2. Send the data back to PayFast's /validate endpoint (they must say VALID),
 *   3. If the payment is COMPLETE, record the order in KV so the buyer can
 *      access a secure, time-limited download link on the success page.
 */
import { PAYFAST_VALIDATE_URLS, payfastMode, payfastSignature } from "../lib/payfast.js";

export async function onRequestPost({ request, env }) {
  try {
    const raw = await request.text();
    const params = new URLSearchParams(raw);
    const data = Object.fromEntries(params);

    // 1. Signature check (sorted fields, minus "signature", plus passphrase).
    const { signature, ...fields } = data;
    const expected = await payfastSignature(fields, env.PAYFAST_PASSPHRASE || "");
    if (signature !== expected) {
      return text("Invalid signature", 400);
    }

    // 2. Validate with PayFast itself — the response body must be "VALID".
    const validateRes = await fetch(PAYFAST_VALIDATE_URLS[payfastMode(env)], {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Some hosts strip these; PayFast's validator checks for them.
        "User-Agent": "the-healthy-way/1.0",
      },
      body: raw,
    });
    const verdict = (await validateRes.text()).trim().toUpperCase();
    if (verdict !== "VALID") {
      return text("Invalid ITN", 400);
    }

    // 3. Record the completed order so the success page can issue a download.
    if (data.payment_status === "COMPLETE" && env.ORDERS) {
      const ref = data.m_payment_id || "";
      if (ref) {
        const product = data.item_name || "";
        const amount = data.amount_gross || data.amount || "";
        await env.ORDERS.put(
          "order:" + ref,
          JSON.stringify({
            status: "COMPLETE",
            product,
            amount,
            email: data.email_address || "",
            paymentId: data.pf_payment_id || "",
            paidAt: new Date().toISOString(),
          }),
          { expirationTtl: 60 * 60 * 24 * 365 } // keep for a year
        );
      }
    }

    return text("success", 200);
  } catch (err) {
    // Always answer PayFast, even on internal errors, so they don't retry
    // forever — but log loudly.
    console.error("ITN error:", err);
    return text("error", 500);
  }
}

function text(message, status) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain" } });
}
