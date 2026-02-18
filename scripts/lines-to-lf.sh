#!/bin/bash



folders=(
    ".vscode/**"
    ".github/**"
    "examples/**"
    "book/**"
    "other/**"
    "personas/**"
    "scripts/**"
    "books/**"
    "documents/**"
    "apps/**"
    "agents/**"
    "prompts/**"
    "src/**"
    "changelog/**"
    "CHANGELOG.md"
    "package-lock.json"
    "README.md"
    "TODO.md"
    "rollup.config.js"
    "tsconfig.json"
    "DICTIONARY.md"
    "jest.config.js"
    "jest.setup.js"
    "package.json"
    "PROGRAMMING.md"
)

for fileOrFolder in "${folders[@]}"; do
    # Note: Recursively find all files, excluding node_modules
    find $fileOrFolder -type f -not -path "*/node_modules/*" -exec dos2unix {} \;
done