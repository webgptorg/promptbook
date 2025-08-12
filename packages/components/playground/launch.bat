@echo off
setlocal enabledelayedexpansion

REM @promptbook/components Playground Launcher for Windows
REM This script helps you quickly start the testing playground

set "PLAYGROUND_DIR=packages\components\playground"
set "COMPONENTS_DIR=packages\components"

echo 🚀 Starting @promptbook/components Playground
echo =============================================

REM Check if we're in the right directory
if not exist "%PLAYGROUND_DIR%" (
    echo ❌ Error: Could not find playground directory. Make sure you're in the project root.
    pause
    exit /b 1
)

REM Check dependencies
echo 🔍 Checking dependencies...

where node >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed. Please install Node.js 18+ to continue.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: npm is not installed. Please install npm to continue.
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1 delims=." %%a in ('node --version') do set "NODE_MAJOR=%%a"
set "NODE_MAJOR=%NODE_MAJOR:~1%"
if %NODE_MAJOR% LSS 18 (
    echo ❌ Error: Node.js version 18+ is required. Current version:
    node --version
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

REM Install root dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing root dependencies...
    npm install
)

REM Build components package if needed
echo 🔨 Building components package...
cd "%COMPONENTS_DIR%"
if not exist "dist" if not exist "esm" (
    echo 📦 Components package not built. Building now...
    npm run build
) else (
    echo ✅ Components package already built
)

REM Go to playground directory
cd "..\..\%PLAYGROUND_DIR%"

REM Install playground dependencies
if not exist "node_modules" (
    echo 📦 Installing playground dependencies...
    npm install
) else (
    echo ✅ Playground dependencies already installed
)

REM Show menu
echo.
echo 🎮 What would you like to do?
echo 1) Start development server (Visual testing)
echo 2) Run unit tests
echo 3) Run tests with UI
echo 4) Run tests with coverage
echo 5) Run performance tests
echo 6) Build for production
echo 7) Preview production build
echo 8) Run all tests (full test suite)
echo 9) Open playground in browser only
echo 0) Exit

set /p choice="Enter your choice (1-9, 0 to exit): "

if "%choice%"=="1" (
    echo 🎨 Starting development server...
    echo Will open at: http://localhost:3001
    npm run dev
) else if "%choice%"=="2" (
    echo 🧪 Running unit tests...
    npm run test
) else if "%choice%"=="3" (
    echo 🖥️ Starting test UI...
    echo Will open at: http://localhost:51204
    npm run test:ui
) else if "%choice%"=="4" (
    echo 📊 Running tests with coverage...
    npm run test:coverage
    echo Coverage report available in: coverage\lcov-report\index.html
) else if "%choice%"=="5" (
    echo ⚡ Running performance tests...
    npm run test:perf
) else if "%choice%"=="6" (
    echo 🏗️ Building for production...
    npm run build
    echo Build completed in: dist\
) else if "%choice%"=="7" (
    echo 👀 Starting preview server...
    npm run build
    npm run preview
) else if "%choice%"=="8" (
    echo 🚀 Running full test suite...
    echo 1. Running unit tests...
    npm run test
    echo 2. Running tests with coverage...
    npm run test:coverage
    echo 3. Running performance tests...
    npm run test:perf || echo Performance tests completed with warnings
    echo 4. Building project...
    npm run build
    echo ✅ Full test suite completed!
) else if "%choice%"=="9" (
    echo 🌐 Opening playground in browser...
    start http://localhost:3001
) else if "%choice%"=="0" (
    echo 👋 Goodbye!
    exit /b 0
) else (
    echo ❌ Invalid choice. Please select 1-9 or 0.
    pause
    exit /b 1
)

pause
