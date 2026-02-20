#!/bin/bash

set -euo pipefail


folders=(
    ".vscode"
    ".github"
    "examples"
    "book"
    "other"
    "personas"
    "scripts"
    "books"
    "documents"
    "apps"
    "agents"
    "prompts"
    "src"
    "changelog"
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
)

for fileOrFolder in "${folders[@]}"; do
    if [ ! -e "$fileOrFolder" ]; then
        continue
    fi

    if [ -f "$fileOrFolder" ]; then
        if [ ! -s "$fileOrFolder" ] || grep -Iq . "$fileOrFolder"; then
            dos2unix "$fileOrFolder"
        fi
        continue
    fi

    # Recursively process files, excluding hidden folders and node_modules.
    # Hidden folders are ignored only below the root target directory.
    find "$fileOrFolder" \
        -mindepth 1 -type d \( -name '.*' -o -name 'node_modules' \) -prune -o \
        -type f -print0 | while IFS= read -r -d '' file; do
            if [ ! -s "$file" ] || grep -Iq . "$file"; then
                dos2unix "$file"
            fi
        done
done