@echo off
echo Starting MySpaceER Enhanced Server...
cd /d "%~dp0\server"
echo Installing dependencies...
npm install
echo.
echo Starting server on http://localhost:3001
echo Press Ctrl+C to stop the server
echo.
node server-enhanced.js