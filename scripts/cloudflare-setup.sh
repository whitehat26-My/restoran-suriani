#!/usr/bin/env bash
#
# Restoran Suriani — Cloudflare zone configuration as code.
#
# Idempotent: every phase converges to the same state on re-run. Scalar
# settings are PATCHed, rulesets are PUT wholesale (declarative replace), and
# DNS records are matched on (type, name) before create-or-update.
#
# Run the phases IN ORDER. Several of them break things if run early:
#
#   1. dns-www    placeholder www records (needed by the redirect rule)
#   2. dns-email  anti-spoofing records — null MX, SPF, DMARC, null DKIM
#   3. tls        SSL mode, TLS versions, HTTPS rewrites  (NOT always-https)
#   4. wait-cert  block until Universal SSL is active
#   5. https-on   always_use_https                        (needs step 4)
#   6. caa        CAA records                             (needs step 4)
#   7. waf        custom firewall rules + rate limiting + www->apex redirect
#   8. bots       Bot Fight Mode — then TEST WHATSAPP PREVIEWS
#   9. hsts 1|2|3 staged HSTS rollout, days apart
#  10. hold       zone hold (anti-hijack)
#      search-console <token>   Google Search Console DNS verification
#      verify     read-only report of everything above
#
# Usage:
#   export CF_API_TOKEN=...        # scoped token, see README
#   export CF_ZONE_ID=...          # or let the script look it up by domain
#   ./scripts/cloudflare-setup.sh <phase>
#
# Required token permissions (all scoped to this one zone, never "All zones"):
#   Zone:Read, Zone Settings:Edit, DNS:Edit, Zone WAF:Edit,
#   SSL and Certificates:Edit, Bot Management:Edit,
#   Dynamic URL Redirects:Edit, Zone:Edit (for `hold` only)

set -euo pipefail

DOMAIN="${DOMAIN:-restoransuriani.com}"
API="https://api.cloudflare.com/client/v4"

# --------------------------------------------------------------------------
# Plumbing
# --------------------------------------------------------------------------

RED=$'\033[31m'; GRN=$'\033[32m'; YLW=$'\033[33m'; DIM=$'\033[2m'; RST=$'\033[0m'

die()  { printf '%serror:%s %s\n' "$RED" "$RST" "$*" >&2; exit 1; }
ok()   { printf '  %s✓%s %s\n' "$GRN" "$RST" "$*"; }
warn() { printf '  %s!%s %s\n' "$YLW" "$RST" "$*"; }
step() { printf '\n%s══ %s%s\n' "$DIM" "$*" "$RST"; }

command -v curl >/dev/null || die "curl is required"
command -v jq   >/dev/null || die "jq is required (apt install jq / brew install jq)"

# CF_API_TOKEN is checked in main(), after the usage text, so that running the
# script with no arguments prints help rather than an unrelated error.

# cf METHOD PATH [JSON] — calls the API and fails loudly on an unsuccessful
# response, so a phase never silently half-applies.
cf() {
  local method="$1" path="$2" body="${3:-}" resp
  if [ -n "$body" ]; then
    resp=$(curl -sS -X "$method" "$API$path" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "$body")
  else
    resp=$(curl -sS -X "$method" "$API$path" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json")
  fi

  if [ "$(jq -r '.success' <<<"$resp")" != "true" ]; then
    printf '%sAPI call failed:%s %s %s\n' "$RED" "$RST" "$method" "$path" >&2
    jq -r '.errors[]? | "  [\(.code)] \(.message)"' <<<"$resp" >&2
    return 1
  fi
  printf '%s' "$resp"
}

resolve_zone() {
  if [ -n "${CF_ZONE_ID:-}" ]; then ZONE="$CF_ZONE_ID"; return; fi
  ZONE=$(cf GET "/zones?name=$DOMAIN" | jq -r '.result[0].id // empty')
  [ -n "$ZONE" ] || die "zone '$DOMAIN' not found — register the domain first, then re-run"
}

# setting KEY VALUE_JSON — PATCH a zone setting only when it has drifted.
setting() {
  local key="$1" want="$2" have
  have=$(cf GET "/zones/$ZONE/settings/$key" | jq -c '.value')
  if [ "$have" = "$want" ]; then
    ok "$key already $want"
  else
    cf PATCH "/zones/$ZONE/settings/$key" "{\"value\":$want}" >/dev/null
    ok "$key: $have -> $want"
  fi
}

# dns_record TYPE NAME CONTENT PROXIED [PRIORITY] — create or update in place.
dns_record() {
  local type="$1" name="$2" content="$3" proxied="$4" priority="${5:-}"
  local fqdn payload existing id

  case "$name" in
    "@") fqdn="$DOMAIN" ;;
    *"$DOMAIN") fqdn="$name" ;;
    *) fqdn="$name.$DOMAIN" ;;
  esac

  payload=$(jq -nc --arg t "$type" --arg n "$fqdn" --arg c "$content" \
    --argjson p "$proxied" --arg pr "$priority" '
    { type: $t, name: $n, content: $c, ttl: 1, proxied: $p }
    + (if $pr == "" then {} else { priority: ($pr | tonumber) } end)')

  # Match on (type, name, content) so multiple TXT records on one name — which
  # is legal and common — are not mistaken for each other.
  existing=$(cf GET "/zones/$ZONE/dns_records?type=$type&name=$fqdn" \
    | jq -r --arg c "$content" '.result[] | select(.content == $c) | .id' | head -1)

  if [ -n "$existing" ]; then
    ok "$type $fqdn already set"
    return
  fi

  # Same (type,name) but different content: update rather than duplicate,
  # except for TXT and CAA where multiple values are meaningful.
  if [ "$type" != "TXT" ] && [ "$type" != "CAA" ]; then
    id=$(cf GET "/zones/$ZONE/dns_records?type=$type&name=$fqdn" | jq -r '.result[0].id // empty')
    if [ -n "$id" ]; then
      cf PATCH "/zones/$ZONE/dns_records/$id" "$payload" >/dev/null
      ok "$type $fqdn updated -> $content"
      return
    fi
  fi

  cf POST "/zones/$ZONE/dns_records" "$payload" >/dev/null
  ok "$type $fqdn created -> $content"
}

# --------------------------------------------------------------------------
# Phases
# --------------------------------------------------------------------------

phase_dns_www() {
  step "www placeholder records"
  # The site is served from a Workers Custom Domain on the apex. www does not
  # need an origin — it only needs to be proxied so the zone-level redirect
  # rule can intercept it. 192.0.2.0 (TEST-NET-1) and 100:: (discard prefix)
  # are the reserved addresses used for exactly this pattern.
  #
  # Both A and AAAA are required: with only an A record, IPv6-only clients get
  # NXDOMAIN for www, which also fails the HSTS preload check.
  dns_record A    www "192.0.2.0" true
  dns_record AAAA www "100::"     true
}

phase_dns_email() {
  step "anti-spoofing DNS (this domain sends and receives no mail)"

  # RFC 7505 null MX — "this domain accepts no mail", rejected at connection.
  if ! dns_record MX "@" "." false 0; then
    warn "null MX rejected by the API — SPF -all and DMARC p=reject still block spoofing"
  fi

  # Hard-fail SPF: no host is authorised to send as this domain.
  dns_record TXT "@" "v=spf1 -all" false
  dns_record TXT "*" "v=spf1 -all" false

  # p=reject alone leaves subdomain handling ambiguous in some receivers;
  # sp=reject makes it explicit. No rua=/ruf= — they have no mailbox to
  # receive reports, and publishing an unreachable report address is worse
  # than publishing none.
  dns_record TXT "_dmarc" "v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; pct=100" false

  # Wildcard null DKIM: an empty p= means "this key is revoked" (RFC 6376),
  # which answers for every possible selector rather than just one.
  dns_record TXT "*._domainkey" "v=DKIM1; p=" false
}

phase_tls() {
  step "TLS"
  # "strict" is safe and correct here: the origin is Cloudflare's own asset
  # layer, which always presents a valid certificate.
  setting ssl '"strict"'
  setting min_tls_version '"1.2"'
  setting tls_1_3 '"on"'
  setting opportunistic_encryption '"on"'
  setting automatic_https_rewrites '"on"'
  setting browser_check '"on"'

  # "medium", not "high". Malaysian mobile networks are heavily CGNAT'd — one
  # bad actor behind a carrier IP raises that IP's threat score, and "high"
  # would start challenging real customers trying to read the menu.
  setting security_level '"medium"'

  # 0-RTT is deliberately left off: it permits replay of early-data requests
  # and buys a brochure site nothing.

  cf PATCH "/zones/$ZONE/ssl/universal/settings" '{"enabled":true}' >/dev/null
  ok "Universal SSL enabled"
}

phase_wait_cert() {
  step "waiting for Universal SSL to issue"
  local i status
  for i in $(seq 1 60); do
    status=$(cf GET "/zones/$ZONE/ssl/certificate_packs?status=all" \
      | jq -r '[.result[] | select(.type=="universal") | .status] | first // "none"')
    if [ "$status" = "active" ]; then ok "certificate active"; return 0; fi
    printf '  %s… %s (%d/60)%s\r' "$DIM" "$status" "$i" "$RST"
    sleep 10
  done
  die "certificate did not become active — do NOT run https-on or caa yet"
}

phase_https_on() {
  step "force HTTPS"
  # Only safe once the certificate is active: enabling this earlier redirects
  # visitors to an HTTPS URL that fails the TLS handshake.
  setting always_use_https '"on"'
}

phase_caa() {
  step "CAA"
  # Cloudflare's Universal SSL partner CAs are Let's Encrypt, Google Trust
  # Services and SSL.com. On the Free plan you cannot pin which one is used
  # and Cloudflare may rotate between them, so all three must be authorised.
  #
  # issuewild is NOT optional: the Universal SSL certificate carries a
  # *.restoransuriani.com SAN, and a CAA set with issue but no issuewild
  # blocks issuance with "CAA records block issuance".
  #
  # This phase is additive only. Cloudflare maintains its own CAA entries for
  # Universal SSL; a reconcile-to-exact-list implementation would delete them
  # and break renewal.
  local ca
  for ca in 'letsencrypt.org' 'pki.goog; cansignhttpexchanges=yes' 'ssl.com'; do
    dns_record CAA "@" "0 issue \"$ca\""     false
    dns_record CAA "@" "0 issuewild \"$ca\"" false
  done
  warn "verify with: dig +short CAA $DOMAIN"
}

phase_waf() {
  step "WAF custom rules"

  # Note: every expression below uses starts_with/ends_with/in rather than
  # regex. The `matches` operator is Business plan and above — any recipe
  # using regex will simply be rejected on Free.
  #
  # The /.well-known/ exclusion is load-bearing. Cloudflare uses HTTP DCV at
  # /.well-known/pki-validation/... for certificate issuance and renewal. A
  # rule that blocks all dot-prefixed paths breaks renewal ~60 days later,
  # long after anyone remembers deploying it.
  local scanner_paths='starts_with(lower(http.request.uri.path), "/wp-") or starts_with(lower(http.request.uri.path), "/wordpress") or starts_with(lower(http.request.uri.path), "/xmlrpc.php") or starts_with(lower(http.request.uri.path), "/.git") or starts_with(lower(http.request.uri.path), "/.env") or starts_with(lower(http.request.uri.path), "/.svn") or starts_with(lower(http.request.uri.path), "/.aws") or starts_with(lower(http.request.uri.path), "/.ssh") or starts_with(lower(http.request.uri.path), "/admin") or starts_with(lower(http.request.uri.path), "/administrator") or starts_with(lower(http.request.uri.path), "/phpmyadmin") or starts_with(lower(http.request.uri.path), "/cgi-bin") or starts_with(lower(http.request.uri.path), "/vendor/") or starts_with(lower(http.request.uri.path), "/actuator") or ends_with(lower(http.request.uri.path), ".php") or ends_with(lower(http.request.uri.path), ".asp") or ends_with(lower(http.request.uri.path), ".aspx") or ends_with(lower(http.request.uri.path), ".jsp") or ends_with(lower(http.request.uri.path), ".sql") or ends_with(lower(http.request.uri.path), ".bak") or ends_with(lower(http.request.uri.path), ".old") or ends_with(lower(http.request.uri.path), ".ini") or ends_with(lower(http.request.uri.path), ".env")'

  cf PUT "/zones/$ZONE/rulesets/phases/http_request_firewall_custom/entrypoint" \
    "$(jq -nc --arg sp "$scanner_paths" '{
      rules: [
        {
          description: "Block scanner and exploit probe paths",
          action: "block",
          enabled: true,
          expression: ("(not starts_with(http.request.uri.path, \"/.well-known/\")) and (" + $sp + ")")
        },
        {
          description: "Block write methods (site is 100% static, nothing accepts input)",
          action: "block",
          enabled: true,
          expression: "(not http.request.method in {\"GET\" \"HEAD\" \"OPTIONS\"})"
        }
      ]
    }')" >/dev/null
  ok "2 custom rules deployed (Free plan allows 5 — 3 left in reserve)"

  step "rate limiting"
  # Scoped to HTML documents, not all requests: one page load fires ~12
  # requests, so an all-requests cap would trip after a handful of page views.
  # Counting documents means this counts page views.
  #
  # cf.colo.id is mandatory in characteristics on non-Enterprise plans — the
  # API rejects the rule without it. Counting is therefore per-datacenter, so
  # the effective global rate is higher than the nominal number.
  #
  # 60/min is deliberately generous because of carrier CGNAT: a whole
  # neighbourhood of Maxis subscribers can share one IPv4 address.
  cf PUT "/zones/$ZONE/rulesets/phases/http_ratelimit/entrypoint" \
    '{"rules":[{
      "description": "Per-IP cap on page requests",
      "action": "block",
      "enabled": true,
      "expression": "(http.request.uri.path eq \"/\" or ends_with(http.request.uri.path, \".html\"))",
      "ratelimit": {
        "characteristics": ["ip.src", "cf.colo.id"],
        "period": 60,
        "requests_per_period": 60,
        "mitigation_timeout": 60,
        "requests_to_origin": false
      }
    }]}' >/dev/null
  ok "rate limit: 60 page requests / minute / IP"

  step "www -> apex redirect"
  cf PUT "/zones/$ZONE/rulesets/phases/http_request_dynamic_redirect/entrypoint" \
    "$(jq -nc --arg d "$DOMAIN" '{
      rules: [{
        description: "301 www to apex",
        action: "redirect",
        enabled: true,
        expression: ("(http.host eq \"www." + $d + "\")"),
        action_parameters: {
          from_value: {
            status_code: 301,
            target_url: { expression: ("concat(\"https://" + $d + "\", http.request.uri.path)") },
            preserve_query_string: true
          }
        }
      }]
    }')" >/dev/null
  ok "www.$DOMAIN -> $DOMAIN (301)"

  step "managed rules"
  # The full Cloudflare Managed Ruleset is Pro+. Free zones get the curated
  # "Cloudflare Free Managed Ruleset", which is deployed automatically — there
  # is nothing to create, so this only reports.
  if cf GET "/zones/$ZONE/rulesets/phases/http_request_firewall_managed/entrypoint" >/dev/null 2>&1; then
    ok "managed ruleset entrypoint present"
  else
    ok "no managed entrypoint (normal on Free — the free ruleset still runs)"
  fi
}

phase_bots() {
  step "Bot Fight Mode"
  cf PUT "/zones/$ZONE/bot_management" '{"fight_mode":true}' >/dev/null
  ok "enabled"
  warn "NOW TEST BOTH OF THESE, and disable if either fails:"
  warn "  1. paste https://$DOMAIN into a WhatsApp chat — the preview card must render"
  warn "  2. Search Console -> URL Inspection -> Test Live URL — must succeed"
  warn "On Free, Bot Fight Mode cannot be skipped or excepted for specific"
  warn "bots. WhatsApp previews are this restaurant's main distribution"
  warn "channel, so a false positive here costs real customers."
  warn "Roll back with: cf PUT /zones/\$ZONE/bot_management '{\"fight_mode\":false}'"
}

phase_hsts() {
  local stage="${1:-}"
  local age include preload
  case "$stage" in
    1) age=300;      include=false; preload=false ;;
    2) age=86400;    include=true;  preload=false ;;
    3) age=31536000; include=true;  preload=true  ;;
    *) die "usage: $0 hsts <1|2|3>  (5 minutes / 1 day / 1 year+preload)" ;;
  esac

  step "HSTS stage $stage (max-age=$age, includeSubDomains=$include, preload=$preload)"

  # Staged on purpose. HSTS preload is submitted to a browser-vendor list and
  # takes months to reverse — if www or the apex ever fails TLS afterwards,
  # the site is unreachable with no way to click through. Sit at each stage
  # for at least a day before advancing.
  #
  # nosniff is false here because public/_headers already sets
  # X-Content-Type-Options on asset responses; setting both emits it twice.
  cf PATCH "/zones/$ZONE/settings/security_header" \
    "$(jq -nc --argjson a "$age" --argjson i "$include" --argjson p "$preload" '{
      value: { strict_transport_security: {
        enabled: true, max_age: $a, include_subdomains: $i, preload: $p, nosniff: false } }
    }')" >/dev/null
  ok "applied"

  case "$stage" in
    1) warn "verify, then wait ~24h before stage 2" ;;
    2) warn "confirm https://www.$DOMAIN serves a valid cert, then wait ~1 week" ;;
    3) warn "now submit at https://hstspreload.org — this is hard to undo" ;;
  esac
}

phase_search_console() {
  local token="${1:-}"
  [ -n "$token" ] || die "usage: $0 search-console <google-site-verification token>
  Get it from Search Console -> Add property -> Domain -> it shows a TXT
  record like 'google-site-verification=abc123...'. Pass only the token part."

  step "Google Search Console verification"
  # DNS verification registers a Domain property, which covers the apex, www
  # and every subdomain at once, and unlike an HTML file it cannot be broken by
  # a redeploy. Google keeps checking this record, so it must stay published.
  dns_record TXT "@" "google-site-verification=$token" false
  warn "now click Verify in Search Console (DNS can take a few minutes)"
}

phase_hold() {
  step "zone hold"
  # Stops anyone else adding restoransuriani.com to a different Cloudflare
  # account, which is a real domain-takeover vector.
  cf POST "/zones/$ZONE/hold?include_subdomains=true" >/dev/null
  ok "zone hold enabled"
}

phase_verify() {
  step "current state"
  local s
  for s in ssl min_tls_version tls_1_3 always_use_https automatic_https_rewrites \
           opportunistic_encryption browser_check security_level; do
    printf '  %-28s %s\n' "$s" "$(cf GET "/zones/$ZONE/settings/$s" | jq -r '.value')"
  done

  printf '  %-28s %s\n' "hsts" \
    "$(cf GET "/zones/$ZONE/settings/security_header" | jq -c '.value.strict_transport_security')"
  printf '  %-28s %s\n' "bot fight mode" \
    "$(cf GET "/zones/$ZONE/bot_management" | jq -r '.result.fight_mode // "n/a"')"
  printf '  %-28s %s\n' "certificate" \
    "$(cf GET "/zones/$ZONE/ssl/certificate_packs?status=all" | jq -r '[.result[]|select(.type=="universal")|.status]|first // "none"')"

  step "DNS"
  cf GET "/zones/$ZONE/dns_records?per_page=100" \
    | jq -r '.result[] | "  \(.type)\t\(.name)\t\(.content)\tproxied=\(.proxied)"' | sort

  step "rulesets"
  local phase
  for phase in http_request_firewall_custom http_ratelimit http_request_dynamic_redirect; do
    printf '  %s\n' "$phase"
    cf GET "/zones/$ZONE/rulesets/phases/$phase/entrypoint" 2>/dev/null \
      | jq -r '.result.rules[]? | "    - \(.description) [\(.action)]"' || printf '    (none)\n'
  done
}

# --------------------------------------------------------------------------

main() {
  local phase="${1:-}"
  [ -n "$phase" ] || { sed -n '3,41p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

  [ -n "${CF_API_TOKEN:-}" ] || die "CF_API_TOKEN is not set"

  resolve_zone
  printf '%szone %s (%s)%s\n' "$DIM" "$DOMAIN" "$ZONE" "$RST"

  case "$phase" in
    dns-www)    phase_dns_www ;;
    dns-email)  phase_dns_email ;;
    tls)        phase_tls ;;
    wait-cert)  phase_wait_cert ;;
    https-on)   phase_https_on ;;
    caa)        phase_caa ;;
    waf)        phase_waf ;;
    bots)       phase_bots ;;
    hsts)           phase_hsts "${2:-}" ;;
    search-console) phase_search_console "${2:-}" ;;
    hold)           phase_hold ;;
    verify)     phase_verify ;;
    *)          die "unknown phase '$phase'" ;;
  esac
}

main "$@"
