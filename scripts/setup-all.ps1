# FinanceFlow — setup completo (Windows)
# Cria banco, .env, instala deps, migrate, seed e valida tudo.
#
# Uso:
#   .\scripts\setup-all.ps1
#   .\scripts\setup-all.ps1 -PostgresPassword "sua_senha_postgres"
param(
  [string]$PostgresUser = "postgres",
  [string]$PostgresPassword = "",
  [string]$DbUser = "financeflow",
  [string]$DbPassword = "financeflow",
  [string]$DbName = "financeflow",
  [int]$DbPort = 5432,
  [switch]$SkipDev
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$ProjectRoot = Get-Location

function Write-Step($n, $total, $msg) {
  Write-Host ""
  Write-Host "[$n/$total] $msg" -ForegroundColor Cyan
}

function Write-Ok($msg) { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  FAIL $msg" -ForegroundColor Red }

function Find-Psql {
  $cmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe"
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

function Invoke-Psql($PsqlPath, $Sql, $User, $Password) {
  $env:PGPASSWORD = $Password
  $env:PGCLIENTENCODING = "UTF8"
  & $PsqlPath -U $User -h localhost -p $DbPort -d postgres -v ON_ERROR_STOP=1 -c $Sql
  if ($LASTEXITCODE -ne 0) { throw "psql falhou" }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  FinanceFlow — Setup completo Windows  " -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Projeto: $ProjectRoot"

$total = 8

# 1. Node / pnpm
Write-Step 1 $total "Verificando Node.js e pnpm..."
try {
  $nodeV = node -v
  Write-Ok "Node $nodeV"
} catch {
  Write-Fail "Node.js nao encontrado. Instale: https://nodejs.org/"
  exit 1
}

$pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmCmd) {
  Write-Host "  Instalando pnpm..." -ForegroundColor Yellow
  npm install -g pnpm
}
Write-Ok "pnpm $(pnpm -v)"

# 2. PostgreSQL
Write-Step 2 $total "Verificando PostgreSQL..."
$psql = Find-Psql
if (-not $psql) {
  Write-Fail "psql nao encontrado. Instale PostgreSQL: https://www.postgresql.org/download/windows/"
  exit 1
}
Write-Ok "psql -> $psql"

if (-not $PostgresPassword) {
  $secure = Read-Host "Senha do usuario postgres (Enter se nao tiver senha)" -AsSecureString
  $PostgresPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  )
}

# 3. Criar banco e usuario
Write-Step 3 $total "Criando banco '$DbName' e usuario '$DbUser'..."
$sqlCreate = @"
DO `$`$ BEGIN
  CREATE ROLE $DbUser WITH LOGIN PASSWORD '$DbPassword';
EXCEPTION WHEN duplicate_object THEN
  ALTER ROLE $DbUser WITH LOGIN PASSWORD '$DbPassword';
END `$`$;

DO `$`$ BEGIN
  CREATE DATABASE $DbName OWNER $DbUser;
EXCEPTION WHEN duplicate_database THEN NULL;
END `$`$;

GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;
"@

try {
  Invoke-Psql $psql $sqlCreate $PostgresUser $PostgresPassword
  Write-Ok "Banco '$DbName' pronto"
} catch {
  Write-Fail "Nao consegui criar o banco. Senha do postgres correta?"
  Write-Host "  Tente: .\scripts\setup-all.ps1 -PostgresPassword 'SUA_SENHA'" -ForegroundColor Yellow
  exit 1
}

# 4. .env
Write-Step 4 $total "Configurando .env..."
$databaseUrl = "postgresql://${DbUser}:${DbPassword}@localhost:${DbPort}/${DbName}"
$envContent = @"
DATABASE_URL=$databaseUrl
POSTGRES_ADMIN_USER=postgres
POSTGRES_ADMIN_PASSWORD=$PostgresPassword
JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars
JWT_REFRESH_SECRET=change-me-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
PORT=3001
WEB_ORIGIN=http://localhost:3000
"@
Set-Content -Path ".env" -Value $envContent -Encoding UTF8
Write-Ok ".env criado com DATABASE_URL"

# 5. pnpm install
Write-Step 5 $total "Instalando dependencias (pnpm install)..."
pnpm install
if ($LASTEXITCODE -ne 0) { Write-Fail "pnpm install falhou"; exit 1 }
Write-Ok "Dependencias instaladas"

# 6. Prisma generate + migrate
Write-Step 6 $total "Gerando Prisma Client e aplicando migrations..."
pnpm db:prepare
if ($LASTEXITCODE -ne 0) { Write-Fail "db:prepare falhou"; exit 1 }
pnpm --filter @financeflow/database migrate:deploy
if ($LASTEXITCODE -ne 0) { Write-Fail "migrate falhou"; exit 1 }
Write-Ok "Banco migrado"

# 7. Seed
Write-Step 7 $total "Criando usuario demo..."
pnpm db:seed
if ($LASTEXITCODE -ne 0) { Write-Fail "seed falhou"; exit 1 }
Write-Ok "Usuario demo criado"

# 8. Validacao
Write-Step 8 $total "Validando setup..."
pnpm mcp:postgres:check
if ($LASTEXITCODE -ne 0) { Write-Fail "Validacao MCP/Postgres falhou"; exit 1 }
Write-Ok "Postgres + MCP OK"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  TUDO PRONTO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Login:  demo@financeflow.com"
Write-Host "  Senha:  demo123456"
Write-Host "  Web:    http://localhost:3000"
Write-Host "  API:    http://localhost:3001/api/v1"
Write-Host ""
Write-Host "  MCP Cursor: financeflow-postgres (Settings > MCP)" -ForegroundColor DarkGray
Write-Host ""

if (-not $SkipDev) {
  Write-Host "Iniciando app (Ctrl+C para parar)..." -ForegroundColor Cyan
  pnpm dev
}
