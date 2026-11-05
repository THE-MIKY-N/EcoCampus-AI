
@echo off
title EcoCampus AI
cd /d "%~dp0"

echo =====================================
echo       INICIANDO ECOCAMPUS AI
echo =====================================
echo.

if not exist "frontend\package.json" (
    echo ERROR: No se encuentra frontend\package.json
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo Instalando dependencias de React...
    cd /d "%~dp0frontend"
    call npm install
    if errorlevel 1 (
        echo ERROR: No se pudieron instalar las dependencias.
        pause
        exit /b 1
    )
)

cd /d "%~dp0frontend"

echo Abriendo EcoCampus AI...
call npm run dev -- --open

echo.
echo El servidor de React se ha detenido.
pause
