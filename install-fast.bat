@echo off
title FEDDA Fast Installer
cd /d "%~dp0"

:: Check admin (not required but warn if not)
echo.
echo ================================================================
echo   FEDDA FAST INSTALLER
echo   Uses your system Python, Git, Node, Ollama
echo ================================================================
echo.

:: Hand off to PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\install_fast.ps1"

echo.
echo ================================================================
echo   INSTALLATION COMPLETE
echo ================================================================
echo.
echo   Run "run-fast.bat" to start FEDDA.
echo.
pause
