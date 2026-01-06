param(
  [string]$Version = "22.21.1"
)

$ErrorActionPreference = "Stop"

function Find-FnmExe() {
  $candidates = @()

  # If fnm is already on PATH, use it.
  $cmd = Get-Command fnm -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) {
    return $cmd.Source
  }

  # WinGet package install location (works even if PATH hasn't refreshed).
  $pkgRoot = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
  if (Test-Path $pkgRoot) {
    $hit = Get-ChildItem -LiteralPath $pkgRoot -Recurse -Filter "fnm.exe" -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($hit -and $hit.FullName) { return $hit.FullName }
  }

  return $null
}

$fnmExe = Find-FnmExe
if (-not $fnmExe) {
  throw "fnm.exe not found. Install it with: winget install --id Schniz.fnm -e"
}

& $fnmExe env --shell powershell | Out-String | Invoke-Expression

# Ensure version exists; fnm is idempotent.
& $fnmExe install $Version | Out-Null
& $fnmExe use $Version | Out-Null

Write-Host ("[use-node22] Using Node {0}" -f (node -v))
