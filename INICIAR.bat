
@echo off
setlocal
title EcoCampus AI

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ==========================================
echo          INICIANDO ECOCAMPUS AI
echo ==========================================
echo.

REM Comprobar archivos necesarios
if not exist "backend\manage.py" (
    echo ERROR: No se encuentra backend\manage.py
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo ERROR: No se encuentra frontend\package.json
    pause
    exit /b 1
)

REM Comprobar Python
where py >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no esta instalado.
    pause
    exit /b 1
)

py -3.13 --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Se necesita Python 3.13.
    pause
    exit /b 1
)

REM Comprobar Node.js y npm
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm no esta instalado.
    pause
    exit /b 1
)

REM Comprobar configuracion privada
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo Se ha creado el archivo .env.
        echo Configura DJANGO_SECRET_KEY y DB_HOST antes de continuar.
    ) else (
        echo ERROR: No existe el archivo .env.example.
    )
    pause
    exit /b 1
)

REM Crear entorno virtual si no existe
if not exist ".venv\Scripts\python.exe" (
    echo Creando entorno virtual de Python...
    py -3.13 -m venv .venv
    if errorlevel 1 (
        echo ERROR: No se pudo crear el entorno virtual.
        pause
        exit /b 1
    )

    echo Instalando dependencias de Django...
    ".venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"
    if errorlevel 1 (
        echo ERROR: No se pudieron instalar las dependencias.
        pause
        exit /b 1
    )
)

REM Instalar dependencias de React si faltan
if not exist "frontend\node_modules" (
    echo Instalando dependencias de React...
    cd /d "%ROOT%frontend"
    call npm ci
    if errorlevel 1 (
        echo ERROR: No se pudieron instalar las dependencias de React.
        pause
        exit /b 1
    )
    cd /d "%ROOT%"
)

echo.
echo Iniciando servidor Django...
start "EcoCampus AI - Backend" cmd /k "cd /d ""%ROOT%backend"" && ""%ROOT%.venv\Scripts\python.exe"" manage.py runserver 127.0.0.1:8000"

echo Iniciando servidor React...
start "EcoCampus AI - Frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm run dev -- --host 127.0.0.1 --open"

echo.
echo ==========================================
echo  ECOCAMPUS AI SE ESTA INICIANDO
echo.
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:8000
echo ==========================================
echo.
pause
