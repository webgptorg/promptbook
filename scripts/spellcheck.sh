#!/bin/bash

cspell "src/**/*.{ts,tsx,js,jsx,md,json}" || {
    cat <<EOF
🚨 Spellcheck errors found

Add to the dictionary:
./other/cspell-dictionaries/

Then commit with message:
Fix spellcheck
EOF
    exit 1
}