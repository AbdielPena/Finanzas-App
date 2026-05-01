@echo off
TITLE Ejecutar FinanzApp
SET PROJECT_DIR=C:\Users\abdiel\.gemini\antigravity\scratch\finanzapp

echo ==========================================
echo       INICIANDO FINANZAPP
echo ==========================================
echo.
echo 1. Accediendo al directorio: %PROJECT_DIR%
cd /d "%PROJECT_DIR%"

echo 2. Abriendo el navegador en http://localhost:5173...
start http://localhost:5173

echo 3. Iniciando el servidor de desarrollo...
echo (Este proceso debe permanecer abierto mientras uses la app)
echo.
call npm run dev

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Hubo un problema al iniciar el servidor.
    echo Asegurate de tener Node.js instalado y haber ejecutado npm install.
    pause
)
