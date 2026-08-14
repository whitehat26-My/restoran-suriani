<#
.SYNOPSIS
  Work out why Google Search Console will not verify ownership.

.DESCRIPTION
  Search Console reports every failure as the same "Ownership verification
  failed" message, whether the tag is missing, the deploy has not landed, or
  Cloudflare is blocking Google's fetcher. That single message is why this
  has taken several attempts to pin down.

  This script separates those cases. It is read-only and hits nothing but the
  public site and a public DNS resolver, so it needs no API token.

.EXAMPLE
  .\scripts\check-verification.ps1
#>

param(
  [string]$Domain = 'suriani.rest',
  [string]$Token  = '32TdlL1zwr4yjvpR2Qi6vtohPLOQ4MPaTSAkqbSQWdg'
)

try {
  [Net.ServicePointManager]::SecurityProtocol =
    [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch { }

function Head ($m) { Write-Host "`n== $m" -ForegroundColor DarkGray }
function Ok   ($m) { Write-Host "  [ok]   $m" -ForegroundColor Green }
function Bad  ($m) { Write-Host "  [FAIL] $m" -ForegroundColor Red }
function Note ($m) { Write-Host "         $m" -ForegroundColor DarkGray }

# HttpWebRequest rather than Invoke-WebRequest: with AllowAutoRedirect off a
# 3xx arrives as an ordinary response, so a redirect stays visible instead of
# throwing an error that carries no .Response on Windows PowerShell 5.1.
function Fetch {
  param([string]$Url, [string]$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')

  $read = {
    param($resp)
    $body = ''
    try {
      $sr = New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8)
      $body = $sr.ReadToEnd()
      $sr.Close()
    } catch { }
    $h = @{}
    try { foreach ($k in $resp.Headers.AllKeys) { $h[$k] = $resp.Headers[$k] } } catch { }
    return @{ Code = [int]$resp.StatusCode; Body = $body; Headers = $h }
  }

  try {
    $req = [System.Net.HttpWebRequest]::Create($Url)
    $req.Method            = 'GET'
    $req.AllowAutoRedirect = $false
    $req.UserAgent         = $UA
    $req.Timeout           = 20000
    $resp = $req.GetResponse()
    $out  = & $read $resp
    $resp.Close()
    return $out
  } catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if ($resp) { $out = & $read $resp; $resp.Close(); return $out }
    return @{ Code = 0; Body = ''; Headers = @{}; Error = $_.Exception.Message }
  } catch {
    return @{ Code = 0; Body = ''; Headers = @{}; Error = $_.Exception.Message }
  }
}

function HeaderOf ($resp, $name) {
  foreach ($k in $resp.Headers.Keys) { if ($k -ieq $name) { return "$($resp.Headers[$k])" } }
  return $null
}

Write-Host "Checking $Domain for Search Console token $Token" -ForegroundColor Cyan

# --- 1. is the tag deployed at all? -----------------------------------------
Head "1. the homepage, fetched as a browser"
$page = Fetch "https://$Domain/"

if ($page.Code -ne 200) {
  Bad "homepage returned $($page.Code), expected 200"
  if ($page.Error) { Note $page.Error }
  Note "Nothing else here will be meaningful until the site responds."
  exit 1
}
Ok "homepage responds 200"

$tagFound = $page.Body -match 'name\s*=\s*["'']google-site-verification["'']'
$rightTok = $page.Body -match [regex]::Escape($Token)

if ($tagFound -and $rightTok) {
  Ok "verification meta tag is live, with the expected token"
} elseif ($tagFound) {
  Bad "a verification tag is live, but the token does not match"
  $m = [regex]::Match($page.Body, '<meta[^>]*google-site-verification[^>]*>')
  if ($m.Success) { Note "live:     $($m.Value)" }
  Note "expected: $Token"
  Note "Search Console is showing you a different token than the one deployed."
  Note "Copy the token from Search Console and pass it: .\scripts\check-verification.ps1 -Token <token>"
} else {
  Bad "no verification meta tag on the homepage"
  Note "The change has not deployed. Only the 'main' branch deploys -- a commit"
  Note "sitting on a feature branch changes nothing on the live site."
  Note "Check Cloudflare dashboard -> Workers & Pages -> restoran-suriani -> Deployments"
  Note "and confirm the newest deployment is from the latest commit on main."
}

# --- 2. what does Google's fetcher see? -------------------------------------
# Cloudflare bot protection is the failure mode that looks identical to a
# missing tag from inside Search Console: the page is fine in a browser and
# challenged for Google.
Head "2. the homepage, fetched as Google's verifier"
$g = Fetch "https://$Domain/" 'Mozilla/5.0 (compatible; Google-Site-Verification/1.0)'

if ($g.Code -eq 200) {
  Ok "Google's user agent also gets 200"
  if ($g.Body -match [regex]::Escape($Token)) {
    Ok "and the token is present in what Google receives"
  } elseif ($tagFound) {
    Bad "but the token is missing from Google's copy of the page"
    Note "Something is serving different content to Google than to a browser."
  }
} elseif ($g.Code -eq 403 -or $g.Code -eq 503) {
  Bad "Google's user agent is being challenged or blocked ($($g.Code))"
  Note "This is Bot Fight Mode. Cloudflare dashboard -> Security -> Bots"
  Note "-> turn Bot Fight Mode OFF, then retry verification."
  Note "Or run: .\scripts\cloudflare-setup.ps1 bots-off"
} else {
  Bad "Google's user agent got $($g.Code)"
}

$ray = HeaderOf $g 'cf-ray'
if ($ray) { Note "cf-ray: $ray (proves the response came from Cloudflare)" }

# --- 3. the HTML file method ------------------------------------------------
Head "3. the HTML file method, as a fallback"
$f = Fetch "https://$Domain/google$Token.html"
if ($f.Code -eq 200) {
  Ok "/google$Token.html returns 200"
} elseif ($f.Code -eq 307 -or $f.Code -eq 301 -or $f.Code -eq 302) {
  $loc = HeaderOf $f 'location'
  Ok "/google$Token.html returns $($f.Code) -> $loc"
  Note "A redirect is expected here and Google follows it. Not a fault."
} else {
  Bad "/google$Token.html returns $($f.Code)"
  Note "Use the meta tag method instead; it is served from '/' which always exists."
}

# --- 4. DNS TXT, for a Domain property --------------------------------------
# A Domain property accepts ONLY the DNS method. If that is the property type
# in Search Console, no meta tag or HTML file will ever verify it, which is a
# very easy hour to lose.
Head "4. DNS TXT records (only relevant to a 'Domain' property)"
try {
  $doh = Invoke-RestMethod -Uri "https://dns.google/resolve?name=$Domain&type=TXT" `
           -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
  $verif = @()
  if ($doh.Answer) {
    $verif = @($doh.Answer | Where-Object { $_.data -match 'google-site-verification' })
  }
  if ($verif.Count -eq 0) {
    Note "no google-site-verification TXT record published"
    Note "Fine if your property is 'URL prefix'. If it is 'Domain', this is why"
    Note "it will not verify -- a Domain property accepts no other method."
  } else {
    foreach ($v in $verif) {
      $d = "$($v.data)".Trim('"')
      if ($d -match 'abc123|xyz|example|placeholder') {
        Bad "placeholder TXT record still published: $d"
        Note "Delete it in Cloudflare -> DNS. It verifies nothing and is confusing."
      } else {
        Ok "TXT: $d"
      }
    }
  }
} catch {
  Note "could not read TXT over DNS-over-HTTPS: $($_.Exception.Message)"
}

# --- what to do next --------------------------------------------------------
Head "next"
if ($tagFound -and $rightTok -and $g.Code -eq 200) {
  Write-Host "  The proof is live and Google can read it." -ForegroundColor Green
  Write-Host "  In Search Console make sure the property is 'URL prefix'" -ForegroundColor Green
  Write-Host "  (https://$Domain/), pick the 'HTML tag' method, and click Verify." -ForegroundColor Green
  Write-Host "  A 'Domain' property ignores the tag and needs the DNS method." -ForegroundColor Green
} elseif (-not $tagFound) {
  Write-Host "  Deploy first. Nothing in Search Console will work until the" -ForegroundColor Yellow
  Write-Host "  tag appears in section 1 above." -ForegroundColor Yellow
} else {
  Write-Host "  Fix whatever is marked [FAIL] above, then click Verify." -ForegroundColor Yellow
}
Write-Host ""
