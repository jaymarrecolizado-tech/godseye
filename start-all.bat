@echo off
echo Starting Project Tracking Management System...
echo.
echo Starting Backend API Server...
start cmd /k start-backend.bat
echo.
echo Starting Frontend Development Server...
start cmd /k start-frontend.bat
echo.
echo Both servers are starting in separate windows.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
