# Domain, hosting and security — suriani.rest

Everything here is reproducible from the repo. `scripts/cloudflare-setup.sh`
applies the zone configuration through the Cloudflare API; the only steps that
require a human are the ones involving payment, consent or a third party.

Plan assumption: **Cloudflare Free**. Where a control is unavailable on Free,
that is called out rather than quietly skipped.

---

## Why the site lives in `public/`

Cloudflare Pages used to auto-exclude `.git`, `node_modules` and `.DS_Store`
from uploads. **Workers static assets does not.** With `"directory": "."` a
deploy would publish the entire `.git` directory — object store, full history,
every branch — to the public internet.

`.assetsignore` can suppress that, but it is fail-open: every new file added to
the repo root is published by default, and one missing line is a leak. Putting
the site in `public/` makes it fail-closed instead. Nothing outside that folder
can be served, whatever anyone adds later.

---

## Order of operations

Several steps break things if run early. Do them in this order.

### Phase 1 — put the domain on Cloudflare 🧑 *needs you*

`suriani.rest` is already registered. What is left is pointing it at Cloudflare
so the zone exists — everything in Phase 4 operates on that zone.

**If you registered it somewhere other than Cloudflare** (most likely, as
Cloudflare Registrar does not sell every TLD):

1. Cloudflare dashboard → **Add a domain** → enter `suriani.rest` → choose the
   **Free** plan. Cloudflare scans for existing DNS records; there should be
   none worth keeping on a fresh domain.
2. Cloudflare shows **two nameservers** (like `xxx.ns.cloudflare.com`). Go to
   the registrar where you bought the domain, find the nameserver / DNS
   settings, and **replace** its nameservers with Cloudflare's two. Replace,
   not add — leaving the registrar's own nameservers alongside causes
   intermittent, maddening resolution failures.
3. Wait for the zone status to go **Active**. Usually minutes; the registry can
   take up to 24 hours. Nothing else works until it does.

**If you did register it through Cloudflare**, the zone already exists and you
can skip straight to step 4.

Then, either way:

4. Turn on **auto-renew** and **registrar lock** at whichever registrar holds
   the domain. A lapsed domain is caught by drop-catchers within hours — the
   single most common way a small business loses its website.
5. **Verify the registrant email.** ICANN suspends unverified domains after 15
   days. Use an address someone actually reads.
6. Note the **Zone ID** and **Account ID** from the Cloudflare dashboard
   overview — the setup script needs them.
7. Delete any placeholder DNS records at the apex. A Workers Custom Domain
   cannot attach to a hostname that already has a CNAME.

> **Note on `.rest`** — it behaves like any other gTLD for DNS, certificates
> and HSTS preload, so nothing in this setup changes. The one practical
> difference is that some older apps and spam filters do not recognise newer
> TLDs in bare text, so `suriani.rest` may not auto-link where
> `example.com` would. Write it as `https://suriani.rest` on printed material,
> receipts and social profiles and it will link everywhere.

### Phase 2 — connect the repo 🧑 *needs you*

6. Dashboard → **Workers & Pages** → **Import a repository** → GitHub → authorise
   the Cloudflare Workers and Pages GitHub App.
   **Scope it to `whitehat26-My/restoran-suriani` only** — the default is "All
   repositories".
7. Build settings:
   - Root directory: `/`
   - Build command: *(empty — there is no build)*
   - Deploy command: `npx wrangler deploy`
   - Production branch: `main`
   - Non-production branch builds: **off** (they produce `*.workers.dev` preview
     URLs, which is exactly what `workers_dev: false` exists to prevent)
8. **The Worker name in the dashboard must be exactly `restoran-suriani`**, matching
   `name` in `wrangler.jsonc`, or every build fails with an unhelpful error.

Workers Builds is used rather than GitHub Actions deliberately: it needs no
Cloudflare API token stored in the repo, so a repo compromise cannot leak
credentials that reach beyond this one Worker. For a site maintained by a
non-engineer editing `menu-data.js`, "no secret to leak, no YAML to rot" is
worth more than a reviewable pipeline that is one line long.

### Phase 3 — first deploy

9. Uncomment the `routes` block in `wrangler.jsonc` (it is commented out because
   deploying against a zone that does not exist yet fails the whole deploy).
10. Push to `main`, or run `npx wrangler deploy`. Wrangler creates the apex DNS
    record and requests the certificate itself — **do not create that record by
    hand**.

### Phase 4 — zone configuration

Create a scoped API token first (permissions below), then run the phases in
order. Two equivalent scripts ship — use whichever suits your machine.

**Windows (PowerShell, no dependencies):**

```powershell
$env:CF_API_TOKEN = "..."

.\scripts\cloudflare-setup.ps1 dns-www      # proxied www placeholders
.\scripts\cloudflare-setup.ps1 dns-email    # null MX, SPF, DMARC, null DKIM
.\scripts\cloudflare-setup.ps1 tls          # SSL strict, TLS 1.2+, HTTPS rewrites
.\scripts\cloudflare-setup.ps1 wait-cert    # blocks until Universal SSL is active
.\scripts\cloudflare-setup.ps1 https-on     # always_use_https  (needs the cert)
.\scripts\cloudflare-setup.ps1 caa          # CAA records       (needs the cert)
.\scripts\cloudflare-setup.ps1 waf          # firewall + rate limit + www redirect
.\scripts\cloudflare-setup.ps1 bots         # Bot Fight Mode — then test, see below
.\scripts\cloudflare-setup.ps1 hold         # anti-hijack zone hold
.\scripts\cloudflare-setup.ps1 verify       # read-only report
```

If PowerShell refuses to run it, allow it for that session only:
`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

**macOS / Linux / WSL (bash, needs `curl` and `jq`):**

```sh
export CF_API_TOKEN=...
export DOMAIN=suriani.rest

./scripts/cloudflare-setup.sh dns-www      # proxied www placeholder (A + AAAA)
./scripts/cloudflare-setup.sh dns-email    # null MX, SPF, DMARC, null DKIM
./scripts/cloudflare-setup.sh tls          # SSL strict, TLS 1.2+, HTTPS rewrites
./scripts/cloudflare-setup.sh wait-cert    # blocks until Universal SSL is active
./scripts/cloudflare-setup.sh https-on     # always_use_https  (needs the cert)
./scripts/cloudflare-setup.sh caa          # CAA records       (needs the cert)
./scripts/cloudflare-setup.sh waf          # firewall + rate limit + www redirect
./scripts/cloudflare-setup.sh bots         # Bot Fight Mode — then test, see below
./scripts/cloudflare-setup.sh hold         # anti-hijack zone hold
./scripts/cloudflare-setup.sh verify       # read-only report
```

### Phase 5 — the slow, hard-to-undo things

11. **HSTS, staged over about a week:**
    ```sh
    ./scripts/cloudflare-setup.sh hsts 1   # max-age 5 min      → wait ~24h
    ./scripts/cloudflare-setup.sh hsts 2   # 1 day + subdomains → wait ~1 week
    ./scripts/cloudflare-setup.sh hsts 3   # 1 year + preload
    ```
    Then submit at <https://hstspreload.org>. Preload is a browser-vendor list
    and takes **months** to reverse — if the apex or `www` ever fails TLS
    afterwards, the site becomes unreachable with no way to click through.
    Do not skip the staging.
12. **DNSSEC last**, one click in the Registrar tab. A bad DS record means
    `SERVFAIL` for the whole domain *and* blocks certificate renewal.
13. Turn on Cloudflare **notifications** for certificate expiry and domain
    expiry. Free, and it turns "the site is down and nobody knows why" into an
    email.

---

## What is configured, and why

### DNS

| Type | Name | Value | Purpose |
|---|---|---|---|
| A | `@` | *auto* | Created by the Workers Custom Domain |
| A / AAAA | `www` | `192.0.2.0` / `100::` | Reserved placeholders, **proxied**, so the redirect rule can intercept. Both are needed — with only an A record, IPv6-only clients get NXDOMAIN and HSTS preload fails |
| MX | `@` | `0 .` | RFC 7505 null MX — "accepts no mail" |
| TXT | `@` and `*` | `v=spf1 -all` | No host is authorised to send as this domain |
| TXT | `_dmarc` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` | Reject spoofed mail. `sp=reject` because `p=reject` alone leaves subdomains ambiguous in some receivers |
| TXT | `*._domainkey` | `v=DKIM1; p=` | Empty `p=` means "revoked" for *every* selector, not just one |
| CAA | `@` | `issue` + `issuewild` × 3 CAs | See below |

The restaurant uses WhatsApp and sends no email, so the domain publishes a
complete "nobody may send as us" posture. Without these records anyone can
forge `owner@suriani.rest` — a real and cheap attack against a business
that takes catering bookings.

No `rua=`/`ruf=` on the DMARC record: they have no mailbox to receive reports,
and an unreachable report address is worse than none.

**CAA needs all three CAs, in both `issue` and `issuewild`.** Cloudflare's
Universal SSL partners are Let's Encrypt, Google Trust Services and SSL.com,
and on Free you cannot pin which is used — Cloudflare may rotate. The
certificate also carries a `*.suriani.rest` SAN, so `issue` without
`issuewild` blocks issuance outright. The `caa` phase is **additive only**: it
never deletes CAA records, because Cloudflare maintains its own and removing
them breaks renewal.

### TLS

SSL mode **Full (Strict)**, minimum **TLS 1.2**, TLS 1.3 on, Automatic HTTPS
Rewrites on, Always Use HTTPS on. Strict is correct here with no downside: the
"origin" is Cloudflare's own asset layer, which always presents a valid cert.

**0-RTT is deliberately left off** — it permits replay of early-data requests
and buys a brochure site nothing.

### Security headers — `public/_headers`

A genuinely strict CSP, which this site can afford because it has no inline
code and no third-party subresources:

```
default-src 'none'; script-src 'self' 'sha256-…'; style-src 'self';
img-src 'self' data:; font-src 'self';
frame-src https://www.google.com https://maps.google.com;
form-action 'self'; frame-ancestors 'none'; base-uri 'none';
object-src 'none'; upgrade-insecure-requests
```

No `'unsafe-inline'`, no `'unsafe-eval'`. The single hash covers the JSON-LD
structured-data block. Fonts are self-hosted, so `font-src 'self'` needs no CDN
origin. Also set: `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, a comprehensive `Permissions-Policy`, and
`Cross-Origin-Opener-Policy`/`-Resource-Policy`.

Two things deliberately **not** set:
- `Cross-Origin-Embedder-Policy: require-corp` — would break the Google Maps
  iframe, which does not send CORP.
- `require-trusted-types-for 'script'` — nothing needs it now that the
  `innerHTML` sinks are gone, and it would break the SVG icon rendering.

Note `_headers` matching is **cumulative**, not most-specific-wins. Every
matching block's headers are added, which is why the per-path cache rules start
with `! Cache-Control` — without it responses carry two `Cache-Control` values.

**HSTS is not in `_headers`.** That file only decorates static-asset responses,
so it would miss the `http→https` redirect, the `www→apex` redirect and WAF
block pages — and preload requires the header on the redirect chain. It is set
once at the zone instead.

### WAF and rate limiting

Two of the five Free-plan custom rules are used, leaving three in reserve:

1. Block scanner probe paths (`/wp-*`, `/.env`, `/.git`, `/admin`, `*.php`,
   `*.sql`, `*.bak` …).
2. Block everything except `GET`/`HEAD`/`OPTIONS`. The site is fully static and
   nothing accepts input, so this forecloses a whole class of confusion.

Three constraints that trip up most guides:

- **`/.well-known/` is explicitly excluded.** Cloudflare uses HTTP DCV at
  `/.well-known/pki-validation/…` for certificate renewal. A rule blocking all
  dot-prefixed paths breaks renewal ~60 days later, long after anyone connects
  the two. This exclusion is load-bearing.
- **No regex.** The `matches` operator is Business plan and above; every
  copy-paste recipe online uses it and will simply be rejected on Free. The
  rules use `starts_with`/`ends_with`/`in` instead.
- **Rate limiting counts documents, not requests.** One page load fires about a
  dozen requests, so an all-requests cap trips after a handful of page views.
  Scoped to `/` and `*.html`, 60/minute per IP counts page views. It is
  deliberately generous because Malaysian mobile carriers are heavily CGNAT'd —
  a whole neighbourhood of subscribers can share one IPv4 address. `cf.colo.id`
  is in the characteristics because the API rejects the rule without it on
  non-Enterprise plans.

Security Level is **medium**, not high, for the same CGNAT reason: `high` starts
challenging real customers trying to read the menu.

The full Cloudflare Managed Ruleset is Pro+. Free zones get the curated
**Cloudflare Free Managed Ruleset**, deployed automatically — there is nothing
to create, so the script only verifies it.

Honest assessment: with no origin, no PHP and no database, a request to
`/wp-admin/setup-config.php` already returns a plain 404, and static-asset
requests do not consume the Workers quota. These rules buy **log hygiene**, not
attack-surface reduction. That is still worth two slots, because clean Security
Events are what make a genuine incident visible.

### ⚠️ Bot Fight Mode — test immediately after enabling

Bot Fight Mode is on, but **verify both of these straight away**:

1. Paste `https://suriani.rest` into a WhatsApp chat — the preview card
   must render.
2. Search Console → URL Inspection → Test Live URL — must succeed.

On the Free plan Bot Fight Mode **cannot be skipped or excepted** for specific
bots; it does not run on the Ruleset Engine, so `Skip` actions have no effect.
The only remedy for a false positive is turning it off. WhatsApp link previews
are this restaurant's main distribution channel, so a false positive here costs
real customers. Roll back with `{"fight_mode": false}` if either test fails.

### Things enabled that are easy to miss

- **`workers_dev: false`.** Left on, `restoran-suriani.<account>.workers.dev`
  serves a byte-identical copy of the site that bypasses the entire zone — no
  HSTS, no WAF, no rate limiting, no bot protection — and is duplicate content
  for Google. It must live in config: disabling it in the dashboard alone is
  silently undone by the next `wrangler deploy`.
- **Zone hold.** Stops anyone adding `suriani.rest` to a different
  Cloudflare account, which is a genuine domain-takeover vector.
- **Registrar lock + auto-renew + verified registrant email.** Not glamorous,
  and the most common real-world cause of a small business losing its site.

### Deliberately not done

- **Cloudflare Web Analytics.** Its beacon loads a script from
  `static.cloudflareinsights.com`, permanently loosening the `default-src
  'none'` CSP. Zone Analytics is already free, server-side and needs no
  JavaScript — enough for a restaurant.
- **Blocking AI crawlers.** For a business found by searching "Malay food open
  24 hours Pudu", absence from AI answers is a lost customer, not a security
  win. Nothing here is proprietary — the menu is on a board in the shop. This
  is a business decision, so revisit it if the owner disagrees.
- **Cloudflare Email Routing.** It would install MX records on the apex,
  directly contradicting the null-MX anti-spoofing design.

---

## API token permissions

Create at **My Profile → API Tokens → Create Custom Token**. Scope every zone
permission to `suriani.rest` alone — never "All zones". Set a **TTL**
and, if running from one place, **Client IP filtering**.

| Scope | Permission | Needed for |
|---|---|---|
| Zone | Zone: Read | Resolve the zone ID |
| Zone | Zone Settings: Edit | TLS, HSTS, security level, browser check |
| Zone | DNS: Edit | All records |
| Zone | Zone WAF: Edit | Firewall + rate-limit rulesets |
| Zone | SSL and Certificates: Edit | Universal SSL, cert status |
| Zone | Bot Management: Edit | Bot Fight Mode |
| Zone | Dynamic URL Redirects: Edit | www→apex (**not** covered by Zone WAF) |
| Zone | Zone: Edit | Zone hold only |

With Workers Builds you need **no deploy token at all** — Cloudflare generates
and rotates one internally.

---

## Verification

```sh
D=suriani.rest

# DNS
dig +short NS $D                      # two *.ns.cloudflare.com
dig +short MX $D                      # 0 .
dig +short TXT $D | grep spf          # v=spf1 -all
dig +short TXT _dmarc.$D              # p=reject; sp=reject
dig +short TXT anything._domainkey.$D # v=DKIM1; p=   (proves the wildcard)
dig +short CAA $D                     # 3 issue + 3 issuewild

# Headers — each must appear exactly once
curl -sSI https://$D/ | grep -iE 'strict-transport|content-security|x-content-type|referrer|permissions'
curl -sSI https://$D/ | grep -ci '^strict-transport-security'   # must be 1

# Cache rules — count must be 1, not 2
for p in / /styles.css /assets/storefront.jpg; do
  echo "$p -> $(curl -sSI https://$D$p | grep -i '^cache-control' | tr -d '\r')"
done

# Redirects
curl -sSI http://$D/ | head -3                      # 301 to https, same host
curl -sSIL https://www.$D/ -o /dev/null -w '%{url_effective}\n'

# workers.dev must be dead
curl -sSI https://restoran-suriani.<account>.workers.dev/ | head -1

# 404 must be a real 404, not 200
curl -sSI https://$D/no-such-page | head -1

# WAF: probes blocked, real paths fine, .well-known NOT blocked
for p in /wp-admin/ /.env /.git/config /xmlrpc.php; do
  echo "$p -> $(curl -sS -o /dev/null -w '%{http_code}' https://$D$p)"   # 403
done
curl -sS -o /dev/null -w 'well-known: %{http_code}\n' https://$D/.well-known/acme-challenge/x
#   ^ MUST be 404, never 403 — a 403 here will break certificate renewal
curl -sS -o /dev/null -w 'POST: %{http_code}\n' -X POST https://$D/       # 403

# TLS: 1.3 works, 1.1 rejected
openssl s_client -connect $D:443 -servername $D -tls1_3 </dev/null 2>&1 | grep Protocol
openssl s_client -connect $D:443 -servername $D -tls1_1 </dev/null 2>&1 | grep -qi 'alert\|error' \
  && echo "good: TLS 1.1 rejected"
```

Then the graders: [SSL Labs](https://www.ssllabs.com/ssltest/) (target A+),
[securityheaders.com](https://securityheaders.com/) (target A+),
[CSP Evaluator](https://csp-evaluator.withgoogle.com/), and
[hstspreload.org](https://hstspreload.org) — run its *check* before submitting.

Finally, the test that actually matters: on a phone, on a Malaysian mobile
network, open the site, toggle EN/BM, open a dish, tap the WhatsApp button, and
paste the link into a WhatsApp chat to confirm the preview renders.
