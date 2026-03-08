@echo off
cd /d "%~dp0"

echo.
echo ==========================================
echo      UPDATING FEDDA
echo ==========================================
echo.

:: Pull latest code (safe merge, won't delete local files)
echo Pulling latest from GitHub...
git pull origin main
if errorlevel 1 (
    echo.
    echo [ERROR] Git pull failed. You may have local changes.
    echo   Try: git stash, then run this again.
    pause
    exit /b 1
)

:: Reinstall Python deps if venv exists
if exist "%~dp0venv\Scripts\python.exe" (
    echo.
    echo Updating Python dependencies...
    "%~dp0venv\Scripts\python.exe" -m pip install -r ComfyUI\requirements.txt --quiet 2>nul
    echo Python deps updated.
)

:: Reinstall frontend deps if needed
if exist "%~dp0frontend\package.json" (
    echo.
    echo Updating frontend dependencies...
    cd /d "%~dp0frontend"
    call npm install --silent 2>nul
    cd /d "%~dp0"
    echo Frontend deps updated.
)

echo.
echo ==========================================
echo      UPDATE COMPLETE
echo ==========================================
echo.
pause
