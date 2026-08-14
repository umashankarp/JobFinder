@echo off
REM Serves this folder on http://localhost:8000 so the job-board APIs
REM accept the requests (some reject file:// origins).
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8000/index.html
  python -m http.server 8000
  goto :eof
)

where node >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8000/index.html
  npx --yes http-server . -p 8000 -c-1
  goto :eof
)

echo Neither Python nor Node was found on PATH.
echo Open index.html directly in your browser instead - most sources still work.
pause
