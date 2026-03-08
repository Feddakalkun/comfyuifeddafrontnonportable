@echo off
cd /d "%~dp0"
title FEDDA Launcher

:: ============================================================================
:: RE-ENTRANT SECTIONS (For separate windows)
:: ============================================================================
if "%1"==":launch_ollama" goto :launch_ollama
if "%1"==":launch_comfy" goto :launch_comfy
if "%1"==":launch_backend" goto :launch_backend
if "%1"==":launch_frontend" goto :launch_frontend

:: ============================================================================
:: MAIN LAUNCHER — Non-Portable (uses system tools + venv)
:: ============================================================================
echo.
echo ============================================================================
echo   FEDDA LAUNCHER (Fast Mode — System Tools)
echo ============================================================================
echo.

set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"

:: Verify venv exists
set "VENV_PY=%BASE_DIR%\venv\Scripts\python.exe"
if not exist "%VENV_PY%" (
    echo [ERROR] venv not found! Run install-fast.bat first.
    pause
    exit /b 1
)

:: 1. Start Ollama (system)
echo [1/4] Starting Ollama LLM Engine...
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    start "Ollama LLM Engine" /MIN cmd /k "call "%~f0" :launch_ollama"
    timeout /t 2 /nobreak >nul
) else (
    echo        Ollama not found — AI chat won't work
)

:: 2. Start ComfyUI
echo [2/4] Starting ComfyUI Backend (Port 8199)...
start "ComfyUI Backend" /MIN cmd /k "call "%~f0" :launch_comfy"
timeout /t 3 /nobreak >nul

:: 3. Start FastAPI Backend
echo [3/4] Starting Backend Server (Port 8000)...
start "FEDDA Backend" /MIN cmd /k "call "%~f0" :launch_backend"
timeout /t 2 /nobreak >nul

:: 4. Start Frontend (runs in this window)
echo [4/4] Starting FEDDA UI (Port 5173)...
cd /d "%BASE_DIR%\frontend"
set "PATH=%CD%\node_modules\.bin;%PATH%"

if not exist "node_modules" (
    echo [INFO] node_modules missing, running npm install...
    call npm install
)

call npm run dev
pause
exit /b

:: ============================================================================
:: SUBROUTINE: OLLAMA
:: ============================================================================
:launch_ollama
set "OLLAMA_HOST=127.0.0.1:11434"
echo Running system Ollama...
ollama serve
if %errorlevel% neq 0 (
    echo [ERROR] Ollama crashed!
    pause
)
exit /b

:: ============================================================================
:: SUBROUTINE: COMFYUI
:: ============================================================================
:launch_comfy
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"
set "COMFYUI_DIR=%BASE_DIR%\ComfyUI"
set "VENV_PY=%BASE_DIR%\venv\Scripts\python.exe"

set COMFYUI_OFFLINE=1
set TORIO_USE_FFMPEG=0
set PYTHONUNBUFFERED=1
set PYTHONIOENCODING=utf-8
set PYTHONPATH=%COMFYUI_DIR%;%PYTHONPATH%

echo Clearing port 8199...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8199"') do taskkill /F /PID %%a 2>nul
timeout /t 1 >nul

cd /d "%COMFYUI_DIR%"
"%VENV_PY%" -W ignore::FutureWarning -s -u main.py --port 8199 --listen 127.0.0.1 --reserve-vram 4 --disable-cuda-malloc --enable-cors-header * --preview-method none --disable-auto-launch

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] ComfyUI crashed with error code %errorlevel%
    pause
)
exit /b

:: ============================================================================
:: SUBROUTINE: BACKEND
:: ============================================================================
:launch_backend
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"
set "BACKEND_DIR=%BASE_DIR%\backend"
set "VENV_PY=%BASE_DIR%\venv\Scripts\python.exe"
set "PYTHONPATH=%BACKEND_DIR%;%PYTHONPATH%"

if not exist "%BACKEND_DIR%" (
    echo [ERROR] Backend directory missing: %BACKEND_DIR%
    pause
    exit /b
)

echo Clearing port 8000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000"') do taskkill /F /PID %%a 2>nul
timeout /t 1 >nul

cd /d "%BACKEND_DIR%"
"%VENV_PY%" -u server.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend crashed with error code %errorlevel%
    pause
)
exit /b
