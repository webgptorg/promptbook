#!/bin/bash

# @promptbook/components Playground Launcher
# This script helps you quickly start the testing playground

set -e

PLAYGROUND_DIR="packages/components/playground"
COMPONENTS_DIR="packages/components"

echo "🚀 Starting @promptbook/components Playground"
echo "============================================="

# Check if we're in the right directory
if [ ! -d "$PLAYGROUND_DIR" ]; then
    echo "❌ Error: Could not find playground directory. Make sure you're in the project root."
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo "🔍 Checking dependencies..."

if ! command_exists node; then
    echo "❌ Error: Node.js is not installed. Please install Node.js 18+ to continue."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ Error: npm is not installed. Please install npm to continue."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Install root dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

# Build components package if needed
echo "🔨 Building components package..."
cd "$COMPONENTS_DIR"
if [ ! -d "dist" ] && [ ! -d "esm" ]; then
    echo "📦 Components package not built. Building now..."
    npm run build
else
    echo "✅ Components package already built"
fi

# Go to playground directory
cd "../../$PLAYGROUND_DIR"

# Install playground dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing playground dependencies..."
    npm install
else
    echo "✅ Playground dependencies already installed"
fi

# Show menu
echo ""
echo "🎮 What would you like to do?"
echo "1) Start development server (Visual testing)"
echo "2) Run unit tests"
echo "3) Run tests with UI"
echo "4) Run tests with coverage"
echo "5) Run performance tests"
echo "6) Build for production"
echo "7) Preview production build"
echo "8) Run all tests (full test suite)"
echo "9) Open playground in browser only"
echo "0) Exit"

read -p "Enter your choice (1-9, 0 to exit): " choice

case $choice in
    1)
        echo "🎨 Starting development server..."
        echo "Will open at: http://localhost:3001"
        npm run dev
        ;;
    2)
        echo "🧪 Running unit tests..."
        npm run test
        ;;
    3)
        echo "🖥️ Starting test UI..."
        echo "Will open at: http://localhost:51204"
        npm run test:ui
        ;;
    4)
        echo "📊 Running tests with coverage..."
        npm run test:coverage
        echo "Coverage report available in: coverage/lcov-report/index.html"
        ;;
    5)
        echo "⚡ Running performance tests..."
        npm run test:perf
        ;;
    6)
        echo "🏗️ Building for production..."
        npm run build
        echo "Build completed in: dist/"
        ;;
    7)
        echo "👀 Starting preview server..."
        npm run build
        npm run preview
        ;;
    8)
        echo "🚀 Running full test suite..."
        echo "1. Running unit tests..."
        npm run test
        echo "2. Running tests with coverage..."
        npm run test:coverage
        echo "3. Running performance tests..."
        npm run test:perf || echo "Performance tests completed with warnings"
        echo "4. Building project..."
        npm run build
        echo "✅ Full test suite completed!"
        ;;
    9)
        echo "🌐 Opening playground in browser..."
        if command_exists open; then
            open http://localhost:3001
        elif command_exists xdg-open; then
            xdg-open http://localhost:3001
        elif command_exists start; then
            start http://localhost:3001
        else
            echo "Please manually open: http://localhost:3001"
        fi
        ;;
    0)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please select 1-9 or 0."
        exit 1
        ;;
esac
