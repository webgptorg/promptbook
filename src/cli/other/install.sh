#!/bin/sh

# Note: [🎺] !!!!!!

cd /usr/bin

#echo 'npx ptbk "$@"' > ptbk
echo 'ts-node ~/work/ai/promptbook/src/cli/test/ptbk.ts "$@"' > ptbk

echo 'Promptbook CLI installed successfully!'