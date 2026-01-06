param(
  [string]$RpcUrl = "http://127.0.0.1:8545",
  [string]$HostAddress = "127.0.0.1",
  [int]$Port = 8545,
  [string]$PrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  [int]$FrontendPort = 3000
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host "[dev:local] $Message"
}

function Assert-NodeLts() {
  try {
    $v = (node -p "process.versions.node" 2>$null).Trim()
    if (-not $v) { throw "missing" }
    $major = [int]($v.Split('.')[0])
    if ($major -lt 20 -or $major -ge 23) {
      throw "Unsupported Node $v"
    }
    Write-Info "Node OK ($v)"
  } catch {
    throw "Unsupported Node.js detected. Install Node 22.x (recommended) or 20.x (LTS) to run Next dev + Firebase tooling reliably."
  }
}

function Wait-JsonRpc([string]$Url, [int]$Retries = 40, [int]$DelayMs = 250) {
  $body = '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
  for ($i = 0; $i -lt $Retries; $i++) {
    try {
      Invoke-RestMethod -Uri $Url -Method Post -ContentType "application/json" -Body $body -TimeoutSec 2 | Out-Null
      return
    } catch {
      Start-Sleep -Milliseconds $DelayMs
    }
  }
  throw "Anvil RPC did not respond at $Url"
}

function Read-EnvFile([string]$Path) {
  $map = @{}
  if (!(Test-Path $Path)) { return $map }

  foreach ($line in (Get-Content -LiteralPath $Path -ErrorAction Stop)) {
    $trim = $line.Trim()
    if ($trim.Length -eq 0) { continue }
    if ($trim.StartsWith('#')) { continue }

    $idx = $trim.IndexOf('=')
    if ($idx -lt 1) { continue }

    $key = $trim.Substring(0, $idx)
    $value = $trim.Substring($idx + 1)
    $map[$key] = $value
  }

  return $map
}

function Merge-EnvInto([string]$TargetPath, [string]$SourcePath) {
  $source = Read-EnvFile $SourcePath
  if ($source.Count -eq 0) {
    Write-Info "No env vars found in $SourcePath (skipping merge)."
    return
  }

  $originalLines = @()
  if (Test-Path $TargetPath) {
    $originalLines = Get-Content -LiteralPath $TargetPath
  }

  $keysToUpsert = @($source.Keys)
  $seen = @{}

  $outLines = New-Object System.Collections.Generic.List[string]
  foreach ($line in $originalLines) {
    $trim = $line.Trim()
    $idx = $trim.IndexOf('=')

    if ($idx -gt 0 -and -not $trim.StartsWith('#')) {
      $key = $trim.Substring(0, $idx)
      if ($source.ContainsKey($key)) {
        $outLines.Add("$key=$($source[$key])")
        $seen[$key] = $true
        continue
      }
    }

    $outLines.Add($line)
  }

  foreach ($key in $keysToUpsert) {
    if (-not $seen.ContainsKey($key)) {
      $outLines.Add("$key=$($source[$key])")
    }
  }

  # Ensure trailing newline
  $content = ($outLines -join "`n") + "`n"
  Set-Content -LiteralPath $TargetPath -Value $content -Encoding UTF8
  Write-Info "Merged contract addresses into $TargetPath"
}

$root = Split-Path -Parent $PSScriptRoot
$contractsDir = Join-Path $root "contracts"
$frontendDir = Join-Path $root "apps\frontend"
$foundryBin = Join-Path $env:USERPROFILE ".foundry\bin"
$anvilExe = Join-Path $foundryBin "anvil.exe"
$forgeExe = Join-Path $foundryBin "forge.exe"

if (!(Test-Path $anvilExe)) { throw "Foundry anvil not found at $anvilExe" }
if (!(Test-Path $forgeExe)) { throw "Foundry forge not found at $forgeExe" }
if (!(Test-Path $contractsDir)) { throw "Contracts folder not found at $contractsDir" }
if (!(Test-Path $frontendDir)) { throw "Frontend folder not found at $frontendDir" }

Assert-NodeLts

Write-Info "Stopping existing node/anvil processes (best-effort)"
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process anvil -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Info ("Starting Anvil on {0}:{1}" -f $HostAddress, $Port)
Start-Process -FilePath $anvilExe -ArgumentList "--host", $HostAddress, "--port", "$Port" -WindowStyle Hidden
Wait-JsonRpc -Url $RpcUrl

Write-Info "Deploying contracts and generating apps/frontend/.env.contracts.local"
Push-Location $contractsDir
$env:PRIVATE_KEY = $PrivateKey
& $forgeExe script script/DeployLocal.s.sol:DeployLocal --rpc-url $RpcUrl --broadcast -v
Pop-Location

$contractsEnv = Join-Path $frontendDir ".env.contracts.local"
$envLocal = Join-Path $frontendDir ".env.local"
Merge-EnvInto -TargetPath $envLocal -SourcePath $contractsEnv

Write-Info "Starting frontend dev server"
Push-Location $root
npm --prefix "apps/frontend" run dev
Pop-Location
