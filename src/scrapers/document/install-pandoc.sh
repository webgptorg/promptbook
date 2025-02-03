#!/bin/bash

# TODO: [👩🏼‍🤝‍🧑🏽] This is a draft of auto-installation script for Pandoc
#       Move it into production after testing and verification

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "Installing Pandoc..."

# Check OS type
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command_exists brew; then
        brew install pandoc
    else
        echo "Please install Homebrew first: https://brew.sh/"
        exit 1
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command_exists apt; then
        sudo apt-get update
        sudo apt-get install -y pandoc
    elif command_exists yum; then
        sudo yum install -y pandoc
    else
        echo "Unsupported package manager"
        exit 1
    fi
elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]]; then
    # Windows
    if command_exists choco; then
        choco install pandoc -y
    else
        echo "Please install Chocolatey first: https://chocolatey.org/"
        exit 1
    fi
else
    echo "Unsupported operating system"
    exit 1
fi

# Verify installation
if command_exists pandoc; then
    echo "Pandoc installed successfully!"
    pandoc --version
else
    echo "Pandoc installation failed"
    exit 1
fi