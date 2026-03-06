#!/bin/bash

set -euo pipefail

if [[ -n "$(git status --porcelain=v1)" ]]; then
  echo "Error: git working tree is dirty"
  git status --short
  exit 1
fi