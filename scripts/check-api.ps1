# Verifica se a API esta respondendo
$ErrorActionPreference = "Continue"
Set-Location (Join-Path $PSScriptRoot "..")

$port = 3001
if (Test-Path .env) {
  $match = Select-String -Path .env -Pattern '^PORT=(\d+)' | Select-Object -First 1
  if ($match) { $port = [int]$match.Matches.Groups[1].Value }
}

$url = "http://localhost:$port/api/v1/health"
Write-Host ""
Write-Host "Testando API em $url ..." -ForegroundColor Cyan

try {
  $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
  Write-Host "[OK] API respondendo (status $($response.StatusCode))" -ForegroundColor Green
  Write-Host $response.Content
  exit 0
} catch {
  Write-Host "[FAIL] API nao esta rodando na porta $port" -ForegroundColor Red
  Write-Host ""
  Write-Host "Faca isto:" -ForegroundColor Yellow
  Write-Host "  1. Abra um terminal e rode: pnpm dev:api"
  Write-Host "  2. Espere aparecer 'API OK: http://localhost:$port/api/v1'"
  Write-Host "  3. Em outro terminal: pnpm dev:web  (ou pnpm dev para os dois)"
  Write-Host ""
  Write-Host "Se der erro de porta em uso ou DATABASE_URL, corrija o .env e tente de novo."
  exit 1
}
