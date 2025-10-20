@echo off
echo Starting Patient Management Backend Server...
echo.
cd server
echo Installing dependencies if needed...
call npm install --silent
echo.
echo Starting server on http://localhost:3001
echo Press Ctrl+C to stop the server
echo.
call npm start