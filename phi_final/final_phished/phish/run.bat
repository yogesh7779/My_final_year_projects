@echo off
cd /d %~dp0

echo =============================
echo Activating Virtual Environment
echo =============================

call venv\Scripts\activate.bat

if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Cannot activate venv
    echo Make sure the folder structure is correct.
    pause
    exit /b
)

echo.
echo =============================
echo Starting Backend Server
echo =============================
echo.

python backend\app.py

echo.
echo Backend stopped.
echo Press any key to exit...
pause
