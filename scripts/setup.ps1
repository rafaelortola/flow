# FinanceFlow — setup rapido (Windows, estilo JANIN)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== FinanceFlow Setup ===" -ForegroundColor Cyan

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host "Arquivo .env criado. Coloque SUA_SENHA do postgres em DATABASE_URL." -ForegroundColor Yellow
  exit 1
}

Write-Host "[1/3] Instalando dependencias..." -ForegroundColor Green
pnpm install

Write-Host "[2/3] Sincronizando banco (prisma db push)..." -ForegroundColor Green
pnpm setup

Write-Host ""
Write-Host "=== Pronto! ===" -ForegroundColor Cyan
Write-Host "Login: demo@financeflow.com / demo123456"
Write-Host "Web:   http://localhost:3000"
Write-Host "API:   http://localhost:3001/api/v1"
Write-Host ""
Write-Host "Iniciando app..." -ForegroundColor Green
pnpm dev
