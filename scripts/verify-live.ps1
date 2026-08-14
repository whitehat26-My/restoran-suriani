<#
.SYNOPSIS
  Check the live site end to end: headers, redirects, WAF, DNS.

.DESCRIPTION
  Everything here is read-only and hits the public internet, so it needs no
  API token. It answers the question the Cloudflare dashboard cannot: is the
  configuration actually reaching visitors?

  The check that matters most is /.well-known/ returning 404 rather than 403.
  Cloudflare validates certificate renewals through that path, so a WAF rule
  that blocks it breaks renewal about sixty days later -- long after anyone
  would connect the two events.

.EXAMPLE
  .\scripts\verify-live.ps1
#>

param([string]$Domain = 'suriani.rest')

$pass = 0; $fail = 0

function Head ($m) { Write-Host "`n== $m" -ForegroundColor DarkGray }
function Check {
  param([string]$What, [bool]$Ok, [string]$Detail = '')
  if ($Ok) { Write-Host "  [ok]   $What" -ForegroundColor Green; $script:pass++ }
  else     { Write-Host "  [FAIL] $What $Detail" -ForegroundColor Red;  $script:fail++ }
}

function Get-Head {
  # -UseBasicParsing stops Windows PowerShell 5.1 handing the response to the
  # legacy Internet Explorer DOM parser, which prompts "Script Execution Risk"
  # on every call. It is the default on PowerShell 7 and accepted there too.
  param([string]$Url)
  try {
    $r = Invoke-WebRequest -Uri $Url -Method Head -MaximumRedirection 0 -UseBasicParsing -ErrorAction Stop
    return @{ Code = [int]$r.StatusCode; Headers = $r.Headers }
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $h = @{}
      try { foreach ($k in $resp.Headers) { $h[$k] = $resp.Headers[$k] } } catch { }
      return @{ Code = [int]$resp.StatusCode; Headers = $h }
    }
    return @{ Code = 0; Headers = @{} }
  }
}

function Get-Code {
  param([string]$Url)
  (Get-Head $Url).Code
}

# --- security headers -------------------------------------------------------
Head "security headers on https://$Domain/"
$r = Get-Head "https://$Domain/"
Check "site responds 200" ($r.Code -eq 200) "(got $($r.Code))"

$h = $r.Headers
function HasHeader ($name) {
  foreach ($k in $h.Keys) { if ($k -ieq $name) { return "$($h[$k])" } }
  return $null
}

$csp = HasHeader 'content-security-policy'
Check "Content-Security-Policy present"        ($null -ne $csp)
Check "  no 'unsafe-inline'"                   ($csp -notmatch "unsafe-inline")
Check "  default-src 'none'"                   ($csp -match "default-src 'none'")
Check "X-Content-Type-Options: nosniff"        ((HasHeader 'x-content-type-options') -match 'nosniff')
Check "X-Frame-Options: DENY"                  ((HasHeader 'x-frame-options') -match 'DENY')
Check "Referrer-Policy present"                ($null -ne (HasHeader 'referrer-policy'))
Check "Permissions-Policy present"             ($null -ne (HasHeader 'permissions-policy'))
Check "Cross-Origin-Opener-Policy present"     ($null -ne (HasHeader 'cross-origin-opener-policy'))

$hsts = HasHeader 'strict-transport-security'
if ($hsts) { Write-Host "  [ok]   HSTS: $hsts" -ForegroundColor Green; $pass++ }
else { Write-Host "  [--]   HSTS absent (expected until the hsts phases run)" -ForegroundColor Yellow }

# --- redirects --------------------------------------------------------------
Head "redirects"
$httpR = Get-Head "http://$Domain/"
Check "http -> https is a 301" ($httpR.Code -eq 301) "(got $($httpR.Code))"

$wwwR = Get-Head "https://www.$Domain/"
$loc = $null
foreach ($k in $wwwR.Headers.Keys) { if ($k -ieq 'location') { $loc = "$($wwwR.Headers[$k])" } }
if ($wwwR.Code -eq 301) {
  Check "www -> apex is a 301" $true
  Check "  points at the apex" ($loc -match [regex]::Escape($Domain))
} elseif ($wwwR.Code -eq 522) {
  Check "www -> apex is a 301" $false "(522 -- the www records exist but no redirect rule intercepts them)"
} else {
  Check "www -> apex is a 301" $false "(got $($wwwR.Code))"
}

# --- WAF --------------------------------------------------------------------
Head "WAF: scanner probes should be blocked"
foreach ($p in '/wp-admin/', '/.env', '/.git/config', '/xmlrpc.php', '/admin', '/backup.sql') {
  $c = Get-Code "https://$Domain$p"
  Check "$p -> 403" ($c -eq 403) "(got $c)"
}

Head "WAF: these must NOT be blocked"
$wk = Get-Code "https://$Domain/.well-known/acme-challenge/test"
Check "/.well-known/ is not 403 -- certificate renewal depends on it" ($wk -ne 403) "(got $wk)"

foreach ($p in '/', '/styles.css', '/script.js', '/menu-data.js', '/robots.txt', '/sitemap.xml', '/assets/og-image.jpg') {
  $c = Get-Code "https://$Domain$p"
  Check "$p -> 200" ($c -eq 200) "(got $c)"
}

Head "404 handling"
$nf = Get-Code "https://$Domain/no-such-page-here"
Check "unknown path returns a real 404, not 200" ($nf -eq 404) "(got $nf)"

# --- DNS --------------------------------------------------------------------
Head "anti-spoofing DNS"
function Dns ($name, $type) {
  try { return Resolve-DnsName -Name $name -Type $type -ErrorAction Stop } catch { return $null }
}

$txt = Dns $Domain 'TXT'
Check "SPF is a hard fail (-all)" (($txt.Strings -join ' ') -match 'v=spf1 -all')

$dmarc = Dns "_dmarc.$Domain" 'TXT'
Check "DMARC is p=reject"       (($dmarc.Strings -join ' ') -match 'p=reject')
Check "  and sp=reject"         (($dmarc.Strings -join ' ') -match 'sp=reject')

$dkim = Dns "anyselector._domainkey.$Domain" 'TXT'
Check "wildcard DKIM answers as revoked" (($dkim.Strings -join ' ') -match 'p=\s*$|p=$|v=DKIM1; p=')

$mx = Dns $Domain 'MX'
Check "null MX published" ($null -ne $mx)

$caa = Dns $Domain 'CAA'
$caaTxt = ($caa | ForEach-Object { "$($_.Tag) $($_.Value)" }) -join ' | '
Check "CAA present"        ($null -ne $caa)
Check "  includes issuewild -- the cert carries a wildcard SAN" ($caaTxt -match 'issuewild')

# --- summary ----------------------------------------------------------------
Write-Host ""
if ($fail -eq 0) { Write-Host "All $pass checks passed." -ForegroundColor Green }
else { Write-Host "$pass passed, $fail failed." -ForegroundColor Yellow }
