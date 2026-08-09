@echo off
REM Start the backend Flask app. This script will try to activate a virtual environment if present.
SETLOCAL

REM Look for common venv folders (.venv or venv)
IF EXIST "%~dp0.venv\Scripts\activate.bat" (
    echo Activating .venv...
    call "%~dp0.venv\Scripts\activate.bat"
) ELSE IF EXIST "%~dp0venv\Scripts\activate.bat" (
    echo Activating venv...
    call "%~dp0venv\Scripts\activate.bat"
) ELSE (
    echo No virtual environment activation script found. Using system Python.
)

REM Install requirements if not installed (optional) - uncomment if desired
REM python -m pip install -r "%~dp0requirements.txt"

pushd "%~dp0backend"
echo Starting backend (backend\app.py)...
python app.py

ENDLOCAL
pause









pauseENDLOCALpopdpython app.pyREM Use python to run the app file directly. Adjust if you normally run via "flask run".pushd "%~dp0backend"echo Starting backend (backend\app.py)...:: python -m pip install -r "%~dp0requirements.txt"