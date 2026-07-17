# FinanceFlow — valida setup sem alterar nada
$ErrorActionPreference = "Continue"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host ""
Write-Host "=== FinanceFlow Validate ===" -ForegroundColor Cyan
$ok = $true

function Test-Item($label, $script) {
  try {
    & $script
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) { throw "exit $LASTEXITCODE" }
    Write-Host "[OK]   $label" -ForegroundColor Green
    return $true
  } catch {
    Write-Host "[FAIL] $label -> $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }
}

if (-not (Test-Path .env)) {
  Write-Host "[FAIL] .env nao existe" -ForegroundColor Red
  $ok = $false
} else {
  Write-Host "[OK]   .env existe" -ForegroundColor Green
}

$ok = (Test-Item "Node.js" { node -v }) -and $ok
$ok = (Test-Item "pnpm" { pnpm -v }) -and $ok
$ok = (Test-Item "node_modules" { if (-not (Test-Path node_modules)) { throw "rode pnpm install" } }) -and $ok
$ok = (Test-Item "Prisma client" { pnpm db:prepare }) -and $ok
$ok = (Test-Item "Postgres + MCP" { pnpm mcp:postgres:check }) -and $ok

Write-Host ""
if ($ok) {
  Write-Host "Tudo OK! Rode: pnpm dev" -ForegroundColor Green
  exit 0
} else {
  Write-Host "Algo falhou. Rode: .\scripts\setup-all.ps1" -ForegroundColor Red
  exit 1
}
