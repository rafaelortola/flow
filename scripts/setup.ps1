# FinanceFlow - setup completo para Windows
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== FinanceFlow Setup (Windows) ===" -ForegroundColor Cyan

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host "Arquivo .env criado. Ajuste DATABASE_URL se necessario." -ForegroundColor Yellow
}

Write-Host "[1/5] Instalando dependencias..." -ForegroundColor Green
pnpm install

Write-Host "[2/5] Gerando Prisma Client..." -ForegroundColor Green
pnpm --filter @financeflow/database generate

Write-Host "[3/5] Compilando pacote database..." -ForegroundColor Green
pnpm --filter @financeflow/database build

Write-Host "[4/5] Aplicando migrations..." -ForegroundColor Green
pnpm --filter @financeflow/database migrate:deploy

Write-Host "[5/5] Criando usuario demo..." -ForegroundColor Green
pnpm db:seed

Write-Host ""
Write-Host "=== Pronto! ===" -ForegroundColor Cyan
Write-Host "Login: demo@financeflow.com / demo123456"
Write-Host "Web:   http://localhost:3000"
Write-Host "API:   http://localhost:3001/api/v1"
Write-Host ""
Write-Host "Iniciando app..." -ForegroundColor Green
pnpm dev
