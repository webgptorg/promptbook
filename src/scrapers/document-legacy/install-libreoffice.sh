#!/bin/bash
# install-libreoffice.sh

# TODO: [👩🏼‍🤝‍🧑🏽] This is a draft of auto-installation script for LibreOffice
#       Move it into production after testing and verification

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "Installing LibreOffice..."

# Check OS type
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command_exists brew; then
        brew install --cask libreoffice
    else
        echo "Please install Homebrew first: https://brew.sh/"
        exit 1
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command_exists apt; then
        sudo apt-get update
        sudo apt-get install -y libreoffice
    elif command_exists yum; then
        sudo yum install -y libreoffice
    else
        echo "Unsupported package manager"
        exit 1
    fi
elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]]; then
    # Windows
    if command_exists choco; then
        choco install libreoffice -y
    else
        echo "Please install Chocolatey first: https://chocolatey.org/"
        exit 1
    fi
else
    echo "Unsupported operating system"
    exit 1
fi

# Verify installation
if command_exists libreoffice || command_exists soffice; then
    echo "LibreOffice installed successfully!"
    if command_exists libreoffice; then
        libreoffice --version
    else
        soffice --version
    fi
else
    echo "LibreOffice installation failed"
    exit 1
fi