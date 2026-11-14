/**
 * POST /api/create-payment
 *
 * Takes the buyer's details + product id, builds a signed PayFast payment
 * request, and returns the fields the browser must POST to PayFast.
 * Merchant credentials live in environment secrets only — never in the
 * front-end code.
 */
import { CATALOGUE, PAYFAST_PROCESS_URLS, payfastMode, payfastSignature } from "../lib/payfast.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const { productId, firstName, lastName, email } = body || {};

  const product = CATALOGUE[productId];
  if (!product) return json({ error: "Unknown product." }, 400);
  if (!firstName || !lastName || !email || !/.+@.+\..+/.test(email)) {
    return json({ error: "Please fill in all fields with a valid email." }, 400);
  }

  const merchantId = env.PAYFAST_MERCHANT_ID;
  const merchantKey = env.PAYFAST_MERCHANT_KEY;
  const passphrase = env.PAYFAST_PASSPHRASE || "";
  if (!merchantId || !merchantKey) {
    return json(
      { error: "Payments are not configured yet. Please contact the store owner." },
      500
    );
  }

  // Unique reference we use to look up this order later.
  const paymentId =
    "THW-" + Date.now().toString(36) + "-" + crypto.randomUUID().slice(0, 8);

  const origin = new URL(request.url).origin;

  // Fields PayFast understands. See docs.payfast.co.za
  const fields = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: origin + "/success.html?ref=" + paymentId,
    cancel_url: origin + "/?cancelled=1#products",
    notify_url: origin + "/api/itn",
    name_first: firstName,
    name_last: lastName,
    email_address: email,
    m_payment_id: paymentId,
    amount: product.price,
    item_name: product.title,
    item_description: "Digital download (PDF) — The Healthy Way",
    email_confirmation: "1",
    confirmation_address: email,
  };

  // The signature must be computed over the sorted fields, WITHOUT the
  // signature field itself, with the passphrase appended.
  const signature = await payfastSignature(fields, passphrase);

  return json({
    action: PAYFAST_PROCESS_URLS[payfastMode(env)],
    fields: { ...fields, signature },
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
