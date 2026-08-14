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

  # Google issues a DIFFERENT token per method. The meta tag and the HTML
  # file do not share one, so deriving the filename from $Token builds a URL
  # that was never meant to exist and reports a 404 that means nothing.
  [string]$Token     = '32TdlL1zwr4yjvpR2Qi6vtohPLOQ4MPaTSAkqbSQWdg',
  [string]$FileToken = 'google7383adf7d4950d30'
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

# A stale edge copy looks exactly like a deploy that never ran, so rule it out
# rather than reasoning about it.
$cache = HeaderOf $page 'cf-cache-status'
$cc    = HeaderOf $page 'cache-control'
$age   = HeaderOf $page 'age'
if ($cache) { Note "cf-cache-status: $cache" }
if ($cc)    { Note "cache-control:   $cc" }
if ($age)   { Note "age:             $age seconds" }
if ($cache -match 'HIT') {
  Note "Served from cache. Purge it: Cloudflare -> Caching -> Configuration"
  Note "-> Purge Everything, then re-run this script."
}

# --- 3. the HTML file method ------------------------------------------------
Head "3. the HTML file method, as a fallback"
$f = Fetch "https://$Domain/$FileToken.html"
if ($f.Code -eq 200) {
  Ok "/$FileToken.html returns 200"
} elseif ($f.Code -eq 307 -or $f.Code -eq 301 -or $f.Code -eq 302) {
  $loc = HeaderOf $f 'location'
  Ok "/$FileToken.html returns $($f.Code) -> $loc"
  Note "A redirect is expected here and Google follows it. Not a fault."
} else {
  Bad "/$FileToken.html returns $($f.Code)"
  Note "This file is committed at public/$FileToken.html, so a 404 here is the"
  Note "same missing deploy reported in section 1, not a separate problem."
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
      $d   = "$($v.data)".Trim('"')
      $val = ($d -replace '^\s*google-site-verification\s*=\s*', '')

      if ($d -match 'abc123|xyz|example|placeholder') {
        Bad "placeholder TXT record still published: $d"
        Note "Delete it in Cloudflare -> DNS. It verifies nothing and is confusing."

      } elseif ($val.Length -lt 40) {
        # A DNS token is ~43 characters of base64url. Anything much shorter is
        # a token from a different method pasted into DNS -- most often the
        # HTML file's, which is far shorter and looks plausible.
        Bad "TXT record is not a valid DNS token: $d"
        Note "A DNS token is about 43 characters; this one is $($val.Length)."
        Note "This looks like the HTML file's token published as DNS by mistake."
        Note "It will not verify a Domain property. Delete it, or replace it with"
        Note "the token Search Console shows under the DNS method."

      } else {
        Ok "TXT: $d"
        Note "length $($val.Length) -- plausible as a real DNS token"
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
  Write-Host "  Nothing in Search Console will work until the tag appears in" -ForegroundColor Yellow
  Write-Host "  section 1. The commit is on main, so the site is running an" -ForegroundColor Yellow
  Write-Host "  older build than the repository." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  1. Cloudflare -> Workers & Pages -> restoran-suriani -> Deployments" -ForegroundColor Yellow
  Write-Host "     Compare the newest deployment's commit against:" -ForegroundColor Yellow
  Write-Host "       git log --oneline -1 origin/main" -ForegroundColor Yellow
  Write-Host "     A failed or absent build is the answer; open it and read the log." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  2. Or bypass the git build entirely and push from here:" -ForegroundColor Yellow
  Write-Host "       npx wrangler login" -ForegroundColor Yellow
  Write-Host "       npx wrangler deploy" -ForegroundColor Yellow
  Write-Host "     This uploads your local public/ directly. Run git pull first" -ForegroundColor Yellow
  Write-Host "     so what you upload matches main." -ForegroundColor Yellow
} else {
  Write-Host "  Fix whatever is marked [FAIL] above, then click Verify." -ForegroundColor Yellow
}
Write-Host ""
