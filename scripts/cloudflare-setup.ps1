<#
.SYNOPSIS
  Restoran Suriani -- Cloudflare zone configuration as code, for Windows.

.DESCRIPTION
  A native PowerShell port of scripts/cloudflare-setup.sh. Same phases, same
  order, same behaviour -- but no bash, no jq, no WSL. Everything it needs is
  built into PowerShell 5.1 and later.

  Idempotent: every phase converges to the same state on re-run. Scalar
  settings are PATCHed only on drift, rulesets are PUT wholesale (declarative
  replace), and DNS records are matched before create-or-update.

  Run the phases IN ORDER. Several break things if run early:

    1. dns-www    proxied www placeholders (the redirect rule needs them)
    2. dns-email  anti-spoofing -- null MX, SPF, DMARC, null DKIM
    3. tls        SSL mode, TLS versions, HTTPS rewrites  (NOT always-https)
    4. wait-cert  block until Universal SSL is active
    5. https-on   always_use_https                        (needs step 4)
    6. caa        CAA records                             (needs step 4)
    7. waf        firewall rules + rate limiting + www->apex redirect
    8. bots       Bot Fight Mode -- then TEST WHATSAPP PREVIEWS
    9. hsts 1|2|3 staged rollout, days apart
   10. hold       zone hold (anti-hijack)
       search-console <token>   Google Search Console DNS verification
       verify     read-only report

.EXAMPLE
  $env:CF_API_TOKEN = "..."
  .\scripts\cloudflare-setup.ps1 verify
  .\scripts\cloudflare-setup.ps1 dns-email
  .\scripts\cloudflare-setup.ps1 hsts 1

.NOTES
  If PowerShell blocks the script, run it for this session only with:
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#>

param(
  [Parameter(Position = 0)][string]$Phase,
  [Parameter(Position = 1)][string]$Arg
)

$ErrorActionPreference = 'Stop'
$Domain = if ($env:DOMAIN) { $env:DOMAIN } else { 'suriani.rest' }
# CF_API_BASE exists so this can be pointed at a mock server for testing.
$Api    = if ($env:CF_API_BASE) { $env:CF_API_BASE } else { 'https://api.cloudflare.com/client/v4' }

# Windows PowerShell 5.1 inherits .NET's default protocol selection, which on
# some machines still excludes TLS 1.2. Cloudflare's API refuses anything
# older, and the resulting error says nothing useful about why.
try {
  [Net.ServicePointManager]::SecurityProtocol =
    [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch { }

# --------------------------------------------------------------------------
# Plumbing
# --------------------------------------------------------------------------

function Say  ($m) { Write-Host "  $m" }
function Ok   ($m) { Write-Host "  [ok] $m"   -ForegroundColor Green }
function Warn ($m) { Write-Host "  [!]  $m"   -ForegroundColor Yellow }
function Step ($m) { Write-Host "`n== $m"     -ForegroundColor DarkGray }
function Die  ($m) { Write-Host "error: $m"   -ForegroundColor Red; exit 1 }

function Invoke-CF {
  # -Quiet suppresses the error print for calls where a 4xx is an expected
  # answer rather than a fault -- reading a ruleset phase that has no rules
  # yet returns 404, and printing that looks alarming in a verify report.
  param([string]$Method, [string]$Path, $Body, [switch]$Quiet)

  $headers = @{ Authorization = "Bearer $($env:CF_API_TOKEN)" }
  $params  = @{
    Method      = $Method
    Uri         = "$Api$Path"
    Headers     = $headers
    ContentType = 'application/json'
  }
  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 12 -Compress)
  }

  try {
    $r = Invoke-RestMethod @params
  } catch {
    # Cloudflare returns useful JSON even on 4xx -- surface it rather than
    # letting PowerShell print a bare status code. The body is read differently
    # on 5.1 (WebException) and 7 (HttpResponseMessage), so try both.
    $raw = $null
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      $raw = $_.ErrorDetails.Message
    } elseif ($_.Exception.Response -and $_.Exception.Response.GetResponseStream) {
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $raw = $reader.ReadToEnd()
      } catch { }
    }
    if ($raw -and -not $Quiet) {
      try {
        $j = $raw | ConvertFrom-Json
        foreach ($e in $j.errors) { Write-Host "  [$($e.code)] $($e.message)" -ForegroundColor Red }
      } catch { Write-Host $raw -ForegroundColor Red }
    }
    throw "API call failed: $Method $Path"
  }

  if (-not $r.success) {
    if (-not $Quiet) { foreach ($e in $r.errors) { Write-Host "  [$($e.code)] $($e.message)" -ForegroundColor Red } }
    throw "API call failed: $Method $Path"
  }
  return $r
}

function Resolve-Zone {
  if ($env:CF_ZONE_ID) { return $env:CF_ZONE_ID }
  $r = Invoke-CF GET "/zones?name=$Domain"
  if (-not $r.result -or $r.result.Count -eq 0) {
    Die "zone '$Domain' not found -- check the token is scoped to this zone"
  }
  return $r.result[0].id
}

function Set-Setting {
  param([string]$Key, $Want)
  $have = (Invoke-CF GET "/zones/$Zone/settings/$Key").result.value
  if ("$have" -eq "$Want") { Ok "$Key already $Want" }
  else {
    Invoke-CF PATCH "/zones/$Zone/settings/$Key" @{ value = $Want } | Out-Null
    Ok "$Key : $have -> $Want"
  }
}

function Set-DnsRecord {
  # -Data carries the structured payload some record types demand. CAA is the
  # one that bites: Cloudflare rejects a content string for it and requires
  # { flags; tag; value } instead, with a 9101 that names the missing fields.
  param(
    [string]$Type, [string]$Name, [string]$Content,
    [bool]$Proxied = $false, $Priority = $null, $Data = $null
  )

  $fqdn = switch -Regex ($Name) {
    '^@$'                     { $Domain }
    ([regex]::Escape($Domain) + '$') { $Name }
    default                   { "$Name.$Domain" }
  }

  $body = @{ type = $Type; name = $fqdn; ttl = 1; proxied = $Proxied }
  if ($Data) { $body.data = $Data } else { $body.content = $Content }
  if ($null -ne $Priority) { $body.priority = $Priority }

  $label = if ($Data) { "$($Data.flags) $($Data.tag) `"$($Data.value)`"" } else { $Content }

  $existing = (Invoke-CF GET "/zones/$Zone/dns_records?type=$Type&name=$fqdn").result

  # Exact match already present -- nothing to do. Structured records are
  # compared field by field, since their content string is server-formatted.
  $match = if ($Data) {
    $existing | Where-Object { $_.data.tag -eq $Data.tag -and $_.data.value -eq $Data.value }
  } else {
    $existing | Where-Object { $_.content -eq $Content }
  }
  if ($match) { Ok "$Type $fqdn already set ($label)"; return }

  # Same (type,name) but different content: update rather than duplicate --
  # except TXT and CAA, where multiple values on one name are meaningful.
  if ($Type -ne 'TXT' -and $Type -ne 'CAA' -and $existing.Count -gt 0) {
    Invoke-CF PATCH "/zones/$Zone/dns_records/$($existing[0].id)" $body | Out-Null
    Ok "$Type $fqdn updated -> $label"; return
  }

  Invoke-CF POST "/zones/$Zone/dns_records" $body | Out-Null
  Ok "$Type $fqdn created -> $label"
}

# --------------------------------------------------------------------------
# Phases
# --------------------------------------------------------------------------

function Phase-DnsWww {
  Step "www placeholder records"
  # The site is served from a Workers Custom Domain on the apex. www needs no
  # origin -- only to be proxied, so the zone redirect rule can intercept it.
  # 192.0.2.0 (TEST-NET-1) and 100:: (discard prefix) are reserved for exactly
  # this. Both are required: with only an A record, IPv6-only clients get
  # NXDOMAIN for www, which also fails the HSTS preload check.
  Set-DnsRecord -Type A    -Name www -Content '192.0.2.0' -Proxied $true
  Set-DnsRecord -Type AAAA -Name www -Content '100::'     -Proxied $true
}

function Phase-DnsEmail {
  Step "anti-spoofing DNS (this domain sends and receives no mail)"

  # RFC 7505 null MX -- "accepts no mail", rejected at connection time.
  try { Set-DnsRecord -Type MX -Name '@' -Content '.' -Priority 0 }
  catch { Warn "null MX rejected -- SPF -all and DMARC p=reject still block spoofing" }

  # Hard-fail SPF: no host on earth is authorised to send as this domain.
  Set-DnsRecord -Type TXT -Name '@' -Content 'v=spf1 -all'
  Set-DnsRecord -Type TXT -Name '*' -Content 'v=spf1 -all'

  # sp=reject because p=reject alone leaves subdomains ambiguous in some
  # receivers. No rua=/ruf= -- there is no mailbox to receive reports, and an
  # unreachable report address is worse than none.
  Set-DnsRecord -Type TXT -Name '_dmarc' -Content 'v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; pct=100'

  # Wildcard null DKIM: an empty p= means "revoked" (RFC 6376) for every
  # possible selector, not just one.
  Set-DnsRecord -Type TXT -Name '*._domainkey' -Content 'v=DKIM1; p='
}

function Phase-Tls {
  Step "TLS"
  # "strict" is correct with no downside here: the origin is Cloudflare's own
  # asset layer, which always presents a valid certificate.
  Set-Setting ssl                      'strict'
  Set-Setting min_tls_version          '1.2'
  Set-Setting tls_1_3                  'on'
  Set-Setting opportunistic_encryption 'on'
  Set-Setting automatic_https_rewrites 'on'
  Set-Setting browser_check            'on'

  # "medium", not "high". Malaysian mobile networks are heavily CGNAT'd -- one
  # bad actor behind a carrier IP raises that IP's score, and "high" would
  # start challenging real customers trying to read the menu.
  Set-Setting security_level 'medium'

  # 0-RTT deliberately left off: it permits replay of early-data requests and
  # buys a brochure site nothing.

  Invoke-CF PATCH "/zones/$Zone/ssl/universal/settings" @{ enabled = $true } | Out-Null
  Ok "Universal SSL enabled"
}

function Phase-WaitCert {
  Step "waiting for Universal SSL to issue"
  for ($i = 1; $i -le 60; $i++) {
    $packs  = (Invoke-CF GET "/zones/$Zone/ssl/certificate_packs?status=all").result
    $status = ($packs | Where-Object { $_.type -eq 'universal' } | Select-Object -First 1).status
    if ($status -eq 'active') { Ok "certificate active"; return }
    Write-Host "  ... $status ($i/60)`r" -NoNewline
    Start-Sleep -Seconds 10
  }
  Die "certificate did not become active -- do NOT run https-on or caa yet"
}

function Phase-HttpsOn {
  Step "force HTTPS"
  # Only safe once the certificate is active: earlier, this redirects visitors
  # to an HTTPS URL that fails the handshake.
  Set-Setting always_use_https 'on'
}

function Phase-Caa {
  Step "CAA"
  # Cloudflare's Universal SSL partners are Let's Encrypt, Google Trust
  # Services and SSL.com. On Free you cannot pin which is used and Cloudflare
  # may rotate, so all three must be authorised.
  #
  # issuewild is NOT optional: the certificate carries a *.suriani.rest SAN,
  # and issue-without-issuewild blocks issuance outright.
  #
  # Additive only. Cloudflare maintains its own CAA entries; a
  # reconcile-to-exact-list implementation would delete them and break renewal.
  foreach ($ca in @('letsencrypt.org', 'pki.goog; cansignhttpexchanges=yes', 'ssl.com')) {
    Set-DnsRecord -Type CAA -Name '@' -Data @{ flags = 0; tag = 'issue';     value = $ca }
    Set-DnsRecord -Type CAA -Name '@' -Data @{ flags = 0; tag = 'issuewild'; value = $ca }
  }
  Warn "verify with: nslookup -type=CAA $Domain"
}

function Phase-Waf {
  Step "WAF custom rules"

  # Every expression uses starts_with/ends_with/in rather than regex. The
  # `matches` operator is Business plan and above -- any recipe using regex is
  # simply rejected on Free.
  #
  # The /.well-known/ exclusion is load-bearing: Cloudflare uses HTTP DCV at
  # /.well-known/pki-validation/... for certificate renewal, and a rule
  # blocking all dot-prefixed paths breaks renewal ~60 days later.
  $probe = @(
    '/wp-', '/wordpress', '/xmlrpc.php', '/.git', '/.env', '/.svn', '/.aws',
    '/.ssh', '/admin', '/administrator', '/phpmyadmin', '/cgi-bin', '/vendor/', '/actuator'
  ) | ForEach-Object { "starts_with(lower(http.request.uri.path), `"$_`")" }

  $ext = @(
    '.php', '.asp', '.aspx', '.jsp', '.sql', '.bak', '.old', '.ini', '.env'
  ) | ForEach-Object { "ends_with(lower(http.request.uri.path), `"$_`")" }

  $expr = '(not starts_with(http.request.uri.path, "/.well-known/")) and (' +
          (($probe + $ext) -join ' or ') + ')'

  Invoke-CF PUT "/zones/$Zone/rulesets/phases/http_request_firewall_custom/entrypoint" @{
    rules = @(
      @{ description = 'Block scanner and exploit probe paths'; action = 'block'; enabled = $true; expression = $expr },
      @{ description = 'Block write methods (site is 100% static)'; action = 'block'; enabled = $true
         expression = '(not http.request.method in {"GET" "HEAD" "OPTIONS"})' }
    )
  } | Out-Null
  Ok "2 custom rules deployed (Free allows 5 -- 3 left in reserve)"

  Step "rate limiting"
  # Scoped to documents, not all requests: one page load fires about a dozen
  # requests, so an all-requests cap trips after a handful of page views.
  # cf.colo.id is mandatory in characteristics on non-Enterprise plans.
  #
  # Which period and mitigation timeout a zone may use is an entitlement, and
  # the Free plan is restricted to a 10-second window. Rather than hard-code a
  # guess, try the widest window first and fall back -- the API names the
  # allowed values in its error, but only after rejecting the request.
  $attempts = @(
    @{ period = 60; requests = 60; timeout = 60; label = '60 page requests / minute / IP' },
    @{ period = 10; requests = 50; timeout = 60; label = '50 page requests / 10s / IP, 60s block' },
    @{ period = 10; requests = 50; timeout = 10; label = '50 page requests / 10s / IP, 10s block' }
  )

  $applied = $false
  foreach ($a in $attempts) {
    try {
      Invoke-CF PUT "/zones/$Zone/rulesets/phases/http_ratelimit/entrypoint" -Quiet @{
        rules = @(
          @{ description = 'Per-IP cap on page requests'; action = 'block'; enabled = $true
             expression  = '(http.request.uri.path eq "/" or ends_with(http.request.uri.path, ".html"))'
             ratelimit   = @{
               characteristics     = @('ip.src', 'cf.colo.id')
               period              = $a.period
               requests_per_period = $a.requests
               mitigation_timeout  = $a.timeout
               requests_to_origin  = $false
             } }
        )
      } | Out-Null
      Ok "rate limit: $($a.label)"
      $applied = $true
      break
    } catch { }
  }
  if (-not $applied) { Warn "rate limiting rejected every supported window -- skipped" }

  Step "www -> apex redirect"
  try {
    Invoke-CF PUT "/zones/$Zone/rulesets/phases/http_request_dynamic_redirect/entrypoint" @{
      rules = @(
        @{ description = '301 www to apex'; action = 'redirect'; enabled = $true
           expression  = "(http.host eq `"www.$Domain`")"
           action_parameters = @{
             from_value = @{
               status_code = 301
               target_url  = @{ expression = "concat(`"https://$Domain`", http.request.uri.path)" }
               preserve_query_string = $true
             }
           } }
      )
    } | Out-Null
    Ok "www.$Domain -> $Domain (301)"
  } catch {
    Warn "redirect rule failed -- the token is probably missing Dynamic URL Redirects."
    Warn "Add it in the dashboard instead: Rules -> Redirect Rules -> Create."
    Warn "Everything else in this phase succeeded."
  }

  Step "managed rules"
  # The full Cloudflare Managed Ruleset is Pro+. Free zones get the curated
  # "Cloudflare Free Managed Ruleset", deployed automatically -- nothing to
  # create, so this only reports.
  try {
    Invoke-CF GET "/zones/$Zone/rulesets/phases/http_request_firewall_managed/entrypoint" -Quiet | Out-Null
    Ok "managed ruleset entrypoint present"
  } catch {
    Ok "no managed entrypoint (normal on Free -- the free ruleset still runs)"
  }
}

function Set-FightMode {
  param([bool]$On)
  # This endpoint is a whole-object PUT whose required fields vary by plan and
  # have grown over time (ai_bots_protection and crawler_protection are recent
  # additions). Sending just fight_mode returns a bare "10400 Bad Request"
  # that names nothing. So read the current config, flip the one field, and
  # write the whole thing back -- which stays correct as Cloudflare adds more.
  $current = (Invoke-CF GET "/zones/$Zone/bot_management").result

  $body = @{}
  foreach ($prop in $current.PSObject.Properties) {
    # Server-computed fields are rejected on write.
    if ($prop.Name -in @('using_latest_model', 'stale_zone_configuration')) { continue }
    $body[$prop.Name] = $prop.Value
  }
  $body['fight_mode'] = $On

  # AI crawlers stay allowed on purpose -- for a restaurant found by search,
  # absence from AI answers is a lost customer, not a security win.
  if ($body.ContainsKey('ai_bots_protection')) { $body['ai_bots_protection'] = 'disabled' }

  try {
    Invoke-CF PUT "/zones/$Zone/bot_management" -Quiet $body | Out-Null
    return $true
  } catch {
    Warn "Bot Fight Mode could not be changed from the API on this plan."
    Warn "Use the dashboard instead: Security -> Bots -> Bot Fight Mode."
    Warn "It is the least valuable control here -- the WAF rules, rate limit"
    Warn "and strict TLS do the real work, so skipping it costs little."
    return $false
  }
}

function Phase-Bots {
  Step "Bot Fight Mode"
  if (-not (Set-FightMode $true)) { return }
  Ok "enabled"
  Warn "NOW TEST BOTH, and turn it off if either fails:"
  Warn "  1. paste https://$Domain into a WhatsApp chat -- the preview must render"
  Warn "  2. Search Console -> URL Inspection -> Test Live URL -- must succeed"
  Warn "On Free, Bot Fight Mode cannot be skipped for specific bots. WhatsApp"
  Warn "previews are this restaurant's main channel, so a false positive costs"
  Warn "real customers."
  Warn ""
  Warn "Roll back with:  .\scripts\cloudflare-setup.ps1 bots-off"
}

function Phase-BotsOff {
  Step "Bot Fight Mode -- off"
  if (Set-FightMode $false) { Ok "disabled" }
}

function Phase-Hsts {
  param([string]$Stage)
  $cfg = switch ($Stage) {
    '1' { @{ age = 300;      inc = $false; pre = $false } }
    '2' { @{ age = 86400;    inc = $true;  pre = $false } }
    '3' { @{ age = 31536000; inc = $true;  pre = $true  } }
    default { Die "usage: .\scripts\cloudflare-setup.ps1 hsts 1|2|3  (5 min / 1 day / 1 year+preload)" }
  }

  Step "HSTS stage $Stage (max-age=$($cfg.age), includeSubDomains=$($cfg.inc), preload=$($cfg.pre))"

  # Staged on purpose. Preload is submitted to a browser-vendor list and takes
  # months to reverse -- if www or the apex ever fails TLS afterwards, the site
  # is unreachable with no way to click through.
  #
  # nosniff is false because _headers already sets X-Content-Type-Options on
  # asset responses; setting both emits it twice.
  Invoke-CF PATCH "/zones/$Zone/settings/security_header" @{
    value = @{ strict_transport_security = @{
      enabled = $true; max_age = $cfg.age
      include_subdomains = $cfg.inc; preload = $cfg.pre; nosniff = $false } }
  } | Out-Null
  Ok "applied"

  switch ($Stage) {
    '1' { Warn "verify, then wait ~24h before stage 2" }
    '2' { Warn "confirm https://www.$Domain serves a valid cert, then wait ~1 week" }
    '3' { Warn "now submit at https://hstspreload.org -- this is hard to undo" }
  }
}

function Phase-SearchConsole {
  param([string]$Token)
  if (-not $Token) {
    Die @"
usage: .\scripts\cloudflare-setup.ps1 search-console <token>
  Search Console -> Add property -> Domain shows a TXT record like
  'google-site-verification=xxxxxxxx'. Pass only the part after the '='.
"@
  }

  # Google's tokens are base64url and around 43 characters. Anything with a
  # dot, ellipsis or space in it is documentation text that got pasted
  # verbatim -- publishing it wastes a DNS round trip and leaves a junk
  # record behind, which is exactly the mistake this catches.
  if ($Token -notmatch '^[A-Za-z0-9_-]{20,}$') {
    Die @"
that does not look like a Search Console token: '$Token'

  Tokens are ~43 characters of letters, digits, '-' and '_', with no dots,
  spaces or ellipses. Search Console shows the whole record as

      google-site-verification=XKrM7q_9Fs2...

  and you pass ONLY the part after the '=' -- the real one, not the example.
"@
  }

  Step "Google Search Console verification"

  # Surface any verification records already present, so a stale or mistyped
  # one is visible rather than quietly accumulating alongside the good one.
  $existing = (Invoke-CF GET "/zones/$Zone/dns_records?type=TXT&name=$Domain" -Quiet).result |
              Where-Object { $_.content -like 'google-site-verification=*' }
  foreach ($e in $existing) {
    if ($e.content -notlike "*$Token*") {
      Warn "another verification record exists: $($e.content)"
      Warn "  if that one is stale, delete it in Cloudflare -> DNS -> Records"
    }
  }
  # DNS verification registers a Domain property covering apex, www and every
  # subdomain at once, and unlike an HTML file it survives a redeploy.
  Set-DnsRecord -Type TXT -Name '@' -Content "google-site-verification=$Token"
  Warn "now click Verify in Search Console (DNS can take a few minutes)"
}

function Phase-Hold {
  Step "zone hold"
  # Stops anyone else adding this domain to a different Cloudflare account,
  # which is a real takeover vector -- but it is an Enterprise-only feature,
  # so on Free this reports the equivalent protection rather than failing.
  try {
    Invoke-CF POST "/zones/$Zone/hold?include_subdomains=true" -Quiet | Out-Null
    Ok "zone hold enabled"
  } catch {
    Warn "zone hold is Enterprise-only -- not available on this plan."
    Warn "The protection it offers is against someone adding suriani.rest to"
    Warn "another Cloudflare account. On Free, the equivalent defences are the"
    Warn "registrar lock and auto-renew at Namecheap, which are already on."
  }
}

function Phase-Verify {
  # Every section is independently guarded. verify is a diagnostic, and a
  # token that is missing one permission should still tell you everything
  # else -- an under-scoped token is exactly when you most need the report.
  $missing = @()

  Step "current state"
  foreach ($s in 'ssl','min_tls_version','tls_1_3','always_use_https',
                 'automatic_https_rewrites','opportunistic_encryption',
                 'browser_check','security_level') {
    try {
      $v = (Invoke-CF GET "/zones/$Zone/settings/$s" -Quiet).result.value
      Say ("{0,-28} {1}" -f $s, $v)
    } catch {
      Say ("{0,-28} ? (no permission)" -f $s); $missing += 'Zone Settings: Edit'
    }
  }

  try {
    $h = (Invoke-CF GET "/zones/$Zone/settings/security_header" -Quiet).result.value.strict_transport_security
    Say ("{0,-28} enabled={1} max_age={2} subdomains={3} preload={4}" -f 'hsts', $h.enabled, $h.max_age, $h.include_subdomains, $h.preload)
  } catch { Say ("{0,-28} ? (no permission)" -f 'hsts'); $missing += 'Zone Settings: Edit' }

  try {
    $b = (Invoke-CF GET "/zones/$Zone/bot_management" -Quiet).result.fight_mode
    Say ("{0,-28} {1}" -f 'bot fight mode', $b)
  } catch { Say ("{0,-28} ? (no permission)" -f 'bot fight mode'); $missing += 'Bot Management: Edit' }

  try {
    $cert = ((Invoke-CF GET "/zones/$Zone/ssl/certificate_packs?status=all" -Quiet).result |
             Where-Object { $_.type -eq 'universal' } | Select-Object -First 1).status
    Say ("{0,-28} {1}" -f 'certificate', $cert)
  } catch { Say ("{0,-28} ? (no permission)" -f 'certificate'); $missing += 'SSL and Certificates: Edit' }

  Step "DNS"
  try {
    $recs = (Invoke-CF GET "/zones/$Zone/dns_records?per_page=100" -Quiet).result
    if ($recs) {
      $recs | Sort-Object type, name |
        ForEach-Object { Say ("{0,-6} {1,-34} {2}  proxied={3}" -f $_.type, $_.name, $_.content, $_.proxied) }
    } else { Say "(no records)" }
  } catch { Say "? (no permission)"; $missing += 'DNS: Edit' }

  Step "rulesets"
  foreach ($p in 'http_request_firewall_custom','http_ratelimit','http_request_dynamic_redirect') {
    Say $p
    try {
      $rules = (Invoke-CF GET "/zones/$Zone/rulesets/phases/$p/entrypoint" -Quiet).result.rules
      if ($rules) { $rules | ForEach-Object { Say "    - $($_.description) [$($_.action)]" } }
      else { Say "    (none)" }
    } catch { Say "    (none, or no permission)" }
  }

  if ($missing.Count) {
    Step "token is missing permissions"
    $missing | Sort-Object -Unique | ForEach-Object { Warn "Zone -> $_" }
    Warn ""
    Warn "Add them without changing the token value:"
    Warn "  dash.cloudflare.com -> profile -> API Tokens -> the token -> ... -> Edit"
  }
}

# --------------------------------------------------------------------------

if (-not $Phase) {
  Get-Help $PSCommandPath -Detailed
  exit 1
}
if (-not $env:CF_API_TOKEN) { Die 'CF_API_TOKEN is not set' }

$Zone = Resolve-Zone
Write-Host "zone $Domain ($Zone)" -ForegroundColor DarkGray

switch ($Phase) {
  'dns-www'        { Phase-DnsWww }
  'dns-email'      { Phase-DnsEmail }
  'tls'            { Phase-Tls }
  'wait-cert'      { Phase-WaitCert }
  'https-on'       { Phase-HttpsOn }
  'caa'            { Phase-Caa }
  'waf'            { Phase-Waf }
  'bots'           { Phase-Bots }
  'bots-off'       { Phase-BotsOff }
  'hsts'           { Phase-Hsts $Arg }
  'search-console' { Phase-SearchConsole $Arg }
  'hold'           { Phase-Hold }
  'verify'         { Phase-Verify }
  default          { Die "unknown phase '$Phase'" }
}
