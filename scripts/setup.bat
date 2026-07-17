@echo off
cd /d "%~dp0.."
echo === FinanceFlow Setup (Windows) ===
echo.

if not exist .env (
  copy .env.example .env
  echo Arquivo .env criado. Coloque SUA_SENHA do postgres em DATABASE_URL.
  exit /b 1
)

echo [1/3] Instalando dependencias...
call pnpm install
if errorlevel 1 goto :error

echo [2/3] Sincronizando banco (prisma db push + seed)...
call pnpm setup
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
