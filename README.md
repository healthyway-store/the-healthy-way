# The Healthy Way — digital downloads store (South Africa)

A complete, deployable starter for selling PDF eBooks in South Africa using
**PayFast** — hosted 100% free on **Cloudflare Pages** (static hosting +
serverless functions included on the free plan).

## What's inside

```
index.html              Store front (product grid, FAQ, checkout modal)
products.js             ← EDIT THIS: your product list (titles, prices in ZAR)
assets/styles.css       Design (green wellness palette, mobile-friendly)
assets/app.js           Cart-less "buy now" flow
success.html            Confirms payment & shows the secure download link
wrangler.toml           Cloudflare config (KV namespaces, mode)
functions/
  lib/payfast.js        Shared helpers: MD5 signature, HMAC, catalogue
  api/create-payment.js Builds the signed PayFast request (server-side)
  api/itn.js            PayFast webhook — verifies & records paid orders
  api/order.js          Success page polls this; issues signed download link
  api/download.js       Streams the PDF from private storage after auth
```

## How the payment flow works

1. Buyer clicks **Buy & download**, enters name/email.
2. `/api/create-payment` builds a **signed** PayFast request (credentials
   never leave the server) and the browser is POSTed to PayFast's hosted
   payment page — card, Instant EFT, SnapScan, etc.
3. PayFast redirects back to `success.html` and simultaneously calls the
   `/api/itn` webhook, which verifies the payment with PayFast and stores
   the order in KV.
4. The success page polls `/api/order`; once complete it receives a
   **signed, 30-day expiring link** to `/api/download`.
5. `/api/download` verifies the HMAC token and streams the PDF from private
   KV storage — the files are never publicly accessible.

## Setup (about 30 minutes, all free)

### 1. Sign up for PayFast
- Create an account at https://payfast.io (or use **sandbox** credentials from
  your dashboard for testing — sandbox is the default in `wrangler.toml`).
- Note your **Merchant ID** and **Merchant Key**, and set a **passphrase**
  in your PayFast settings (recommended).

### 2. Put the project on GitHub (free)
```bash
cd the-healthy-way
git init && git add . && git commit -m "The Healthy Way store"
# create a repo on github.com, then:
git remote add origin https://github.com/<you>/the-healthy-way.git
git push -u origin main
```

### 3. Deploy to Cloudflare Pages (free)
- Go to dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** →
  **Connect to Git** and pick the repo.
- Framework preset: **None**; build command: *(empty)*; output dir: `/`.
- After first deploy, go to the project's **Functions → KV namespace bindings**
  and bind:
  - `ORDERS` → a KV namespace (create one, free)
  - `FILES` → another KV namespace
- **Settings → Environment variables** — add these as *Secrets*:
  - `PAYFAST_MERCHANT_ID`
  - `PAYFAST_MERCHANT_KEY`
  - `PAYFAST_PASSPHRASE` (or leave empty if you don't set one — but do set one)
  - `DOWNLOAD_SECRET` — any long random string, e.g. from a password manager
  - `PAYFAST_MODE` = `sandbox` while testing, `live` when you launch

### 4. Upload your PDFs to private storage
Never put PDFs in the public site folder — anyone could download them free.
Upload them to the FILES KV namespace instead:

```bash
npm install -g wrangler
wrangler login

wrangler kv key put "file:clean-eating-28" --path ./pdfs/clean-eating-28.pdf --binding=FILES
wrangler kv key put "file:mindful-eating" --path ./pdfs/mindful-eating.pdf --binding=FILES
wrangler kv key put "file:home-workout" --path ./pdfs/home-workout.pdf --binding=FILES
wrangler kv key put "file:sleep-reset" --path ./pdfs/sleep-reset.pdf --binding=FILES
```
(The key must be `file:` + the product `id` from `products.js`.)

> KV has a 25 MB value limit — fine for normal eBooks. If a PDF is larger,
> use Cloudflare R2 instead (free tier: 10 GB) and adapt `download.js`.

### 5. Test with PayFast sandbox
Deploy, buy one of your own products, and complete the sandbox checkout
(sandbox pages show test card details). Confirm:
- redirect back to the success page ✓
- download link appears and the PDF downloads ✓
- ITN recorded the order (check Pages → Functions → logs) ✓

### 6. Go live
- Flip `PAYFAST_MODE` to `live`, and switch the secrets to your live
  merchant credentials.
- In your PayFast dashboard, make sure the site's domain is allowed.
- (Optional) Custom domain: Cloudflare Pages gives you a free
  `*.pages.dev` subdomain; you can also attach a domain you own. A `.co.za`
  domain costs roughly R100–R300/year via a registrar like x.co.za or
  Domains.co.za — that's the only recurring cost in this whole stack.

## Costs summary

| Item | Cost |
|---|---|
| Hosting + serverless + KV (Cloudflare free tier) | R0 |
| SSL, global CDN | R0 |
| PayFast | No monthly fee; ~2.9–3.5% + fee per sale |
| Custom domain (optional) | ~R100–300/year |

## Legal notes for South Africa

- Register for tax as a sole prop/business when income starts (SARS).
- Include your POPIA-friendly privacy notice once you collect emails.
- All sales final on digital goods is standard, but state it clearly (the FAQ does).

## Next steps / ideas

- Email delivery of the download link (e.g. MailChannels, free on Workers)
- Discount codes
- Bundle pricing
- Google Analytics / Plausible for traffic insights
