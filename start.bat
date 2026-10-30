@echo off
setlocal
cd /d "%~dp0"
title Valentine Local Server
echo ==========================================
echo    Starting Valentine Local Server...
echo ==========================================
echo.
start "" http://localhost:5173/
npm.cmd run dev -- --host 127.0.0.1
pause
