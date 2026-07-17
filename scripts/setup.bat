@echo off
cd /d "%~dp0.."
echo === FinanceFlow Setup (Windows) ===
echo.

if not exist .env (
  copy .env.example .env
  echo Arquivo .env criado. Ajuste DATABASE_URL se necessario.
)

echo [1/5] Instalando dependencias...
call pnpm install
if errorlevel 1 goto :error

echo [2/5] Gerando Prisma Client...
call pnpm --filter @financeflow/database generate
if errorlevel 1 goto :error

echo [3/5] Compilando pacote database...
call pnpm --filter @financeflow/database build
if errorlevel 1 goto :error

echo [4/5] Aplicando migrations...
call pnpm --filter @financeflow/database migrate:deploy
if errorlevel 1 goto :error

echo [5/5] Criando usuario demo...
call pnpm db:seed
if errorlevel 1 goto :error

echo.
echo === Pronto! ===
echo Login: demo@financeflow.com / demo123456
echo.
echo Iniciando app...
call pnpm dev
goto :eof

:error
echo.
echo Erro no setup. Verifique se PostgreSQL esta rodando e DATABASE_URL no .env
exit /b 1
