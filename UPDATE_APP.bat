@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo      UPDATING FEDDA (Fast Mode)
echo ==========================================
echo.
echo Pulling latest changes from GitHub...

git fetch origin main
git reset --hard origin/main
git clean -fd

echo.
echo Running update logic...

:: For fast install: create a junction so update_logic.ps1 finds python_embeded\python.exe
:: update_logic.ps1 expects python_embeded\python.exe — we map venv\Scripts there
if exist "%~dp0venv\Scripts\python.exe" (
    if not exist "%~dp0python_embeded" (
        echo Setting up venv compatibility layer...
        mklink /J "%~dp0python_embeded" "%~dp0venv\Scripts" >nul 2>&1
        if errorlevel 1 (
            echo [NOTE] Junction failed. Running with system python fallback...
        )
    )
)

powershell -ExecutionPolicy Bypass -File "scripts\update_logic.ps1"

:: Clean up temporary junction (only if it IS a junction, not real portable python)
if exist "%~dp0python_embeded" (
    if exist "%~dp0venv\Scripts\python.exe" (
        fsutil reparsepoint query "%~dp0python_embeded" >nul 2>&1
        if not errorlevel 1 (
            rmdir "%~dp0python_embeded" >nul 2>&1
        )
    )
)

echo.
echo Update finished.
pause
