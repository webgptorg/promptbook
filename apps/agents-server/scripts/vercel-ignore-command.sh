#!/usr/bin/env sh

AUTHOR_LOGIN=$(printf '%s' "$VERCEL_GIT_COMMIT_AUTHOR_LOGIN" | tr '[:upper:]' '[:lower:]')
AUTHOR_NAME=$(printf '%s' "$VERCEL_GIT_COMMIT_AUTHOR_NAME" | tr '[:upper:]' '[:lower:]')

if [ "$AUTHOR_LOGIN" = "hejny" ] ||
   [ "$AUTHOR_LOGIN" = "promptbook-coding-agent" ] ||
   [ "$AUTHOR_NAME" = "pavol hejny" ] ||
   [ "$AUTHOR_NAME" = "promptbook coding agent" ] ||
   [ "$AUTHOR_NAME" = "hejny ai agent" ]; then
    exit 1
else
    exit 0
fi
