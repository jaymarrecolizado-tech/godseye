@echo off
REM =============================================================================
REM Project Tracking Management System - Windows Setup Script
REM =============================================================================
REM This script automates the setup process for the Project Tracking
REM Management System on Windows machines.
REM =============================================================================

title Project Tracking System Setup
setlocal EnableDelayedExpansion

REM Colors for output
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "NC=[0m"

echo.
echo %GREEN%=============================================================%NC%
echo %GREEN%  Project Tracking Management System - Setup%NC%
echo %GREEN%=============================================================%NC%
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo %YELLOW%Note: Some operations may require administrator privileges.%NC%
    echo.
)

REM =============================================================================
REM Check Prerequisites
REM =============================================================================
echo %BLUE%Checking prerequisites...%NC%
echo.

REM Check Node.js
call :check_command node "Node.js"
if !errorlevel! neq 0 (
    echo %RED%Node.js is not installed. Please install Node.js v18 or higher.%NC%
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1" %%v in ('node -v') do (
    set NODE_VERSION=%%v
    echo Found Node.js: !NODE_VERSION!
)

REM Check npm
call :check_command npm "npm"
if !errorlevel! neq 0 (
    echo %RED%npm is not installed. Please install npm.%NC%
    pause
    exit /b 1
)

REM Check MySQL
call :check_command mysql "MySQL"
if !errorlevel! neq 0 (
    echo %YELLOW%MySQL command line tools not found in PATH.%NC%
    echo Please ensure MySQL is installed and mysql.exe is in your PATH.
    echo Download from: https://dev.mysql.com/downloads/
    echo.
    set /p CONTINUE="Continue anyway? (y/N): "
    if /I not "!CONTINUE!"=="y" (
        pause
        exit /b 1
    )
)

echo %GREEN%All prerequisites met!%NC%
echo.

REM =============================================================================
REM Database Setup
REM =============================================================================
echo %BLUE%Setting up database...%NC%
echo.

set /p DB_USER="Enter MySQL username (default: root): "
if "!DB_USER!"=="" set DB_USER=root

set /p DB_PASS="Enter MySQL password: "

set DB_NAME=project_tracking

echo.
echo Creating database '%DB_NAME%'...
mysql -u !DB_USER! -p!DB_PASS! -e "CREATE DATABASE IF NOT EXISTS !DB_NAME! CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul

if !errorlevel! neq 0 (
    echo %RED%Failed to create database. Please check your credentials and ensure MySQL is running.%NC%
    echo.
    set /p CONTINUE="Continue with remaining setup? (y/N): "
    if /I not "!CONTINUE!"=="y" (
        pause
        exit /b 1
    )
) else (
    echo %GREEN%Database created successfully!%NC%
    
    REM Run schema
    echo.
    echo Running database schema...
    mysql -u !DB_USER! -p!DB_PASS! !DB_NAME! < database\schema.sql
    if !errorlevel! equ 0 (
        echo %GREEN%Schema applied successfully!%NC%
    ) else (
        echo %RED%Failed to apply schema.%NC%
    )
    
    REM Run seeds
    echo.
    echo Seeding database...
    for %%f in (database\seeds\*.sql) do (
        echo   - Processing %%f
        mysql -u !DB_USER! -p!DB_PASS! !DB_NAME! < "%%f"
    )
    echo %GREEN%Database seeded successfully!%NC%
)

echo.

REM =============================================================================
REM Backend Setup
REM =============================================================================
echo %BLUE%Setting up backend...%NC%
echo.

cd backend

if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
    if !errorlevel! neq 0 (
        echo %RED%Failed to install backend dependencies.%NC%
        cd ..
        pause
        exit /b 1
    )
) else (
    echo Backend dependencies already installed.
)

REM Create .env file
if not exist ".env" (
    echo Creating backend .env file...
    (
        echo # Server Configuration
        echo PORT=3001
        echo NODE_ENV=development
        echo.
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_NAME=!DB_NAME!
        echo DB_USER=!DB_USER!
        echo DB_PASSWORD=!DB_PASS!
        echo.
        echo # JWT Authentication
        echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
        echo.
        echo # CORS Configuration
        echo CORS_ORIGIN=http://localhost:3000
        echo.
        echo # File Upload
        echo UPLOAD_MAX_SIZE=10485760
    ) > .env
    echo %GREEN%Backend .env file created!%NC%
) else (
    echo Backend .env file already exists.
)

cd ..

REM =============================================================================
REM Frontend Setup
REM =============================================================================
echo.
echo %BLUE%Setting up frontend...%NC%
echo.

cd frontend

if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
    if !errorlevel! neq 0 (
        echo %RED%Failed to install frontend dependencies.%NC%
        cd ..
        pause
        exit /b 1
    )
) else (
    echo Frontend dependencies already installed.
)

REM Create .env.local file
if not exist ".env.local" (
    echo Creating frontend .env.local file...
    (
        echo VITE_API_URL=http://localhost:3001/api
    ) > .env.local
    echo %GREEN%Frontend .env.local file created!%NC%
) else (
    echo Frontend .env.local file already exists.
)

cd ..

REM =============================================================================
REM Setup Complete
REM =============================================================================
echo.
echo %GREEN%=============================================================%NC%
echo %GREEN%  Setup Complete!%NC%
echo %GREEN%=============================================================%NC%
echo.
echo %YELLOW%Next Steps:%NC%
echo.
echo 1. Start the backend server:
echo    %BLUE%cd backend ^&^& npm run dev%NC%
echo.
echo 2. In a new terminal, start the frontend:
echo    %BLUE%cd frontend ^&^& npm run dev%NC%
echo.
echo 3. Open your browser and navigate to:
echo    %BLUE%http://localhost:3000%NC%
echo.
echo %YELLOW%Or use Docker (requires Docker Desktop):%NC%
echo    %BLUE%docker-compose up -d%NC%
echo.
echo %GREEN%=============================================================%NC%
echo.

set /p START_NOW="Would you like to start the application now? (y/N): "
if /I "!START_NOW!"=="y" (
    echo.
    echo Starting backend and frontend...
    start "Backend Server" cmd /k "cd backend && npm run dev"
    timeout /t 3 /nobreak >nul
    start "Frontend Server" cmd /k "cd frontend && npm run dev"
    echo.
    echo %GREEN%Servers starting...%NC%
    echo Backend will be available at: http://localhost:3001
    echo Frontend will be available at: http://localhost:3000
    timeout /t 5 /nobreak >nul
)

goto :eof

REM =============================================================================
REM Functions
REM =============================================================================

:check_command
where %~1 >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[MISSING] %~2%NC%
    exit /b 1
) else (
    echo %GREEN%[FOUND] %~2%NC%
    exit /b 0
)

:eof
endlocal
