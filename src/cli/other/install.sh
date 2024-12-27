#!/bin/sh

# TODO: [🎺] This is a draft of installer script

# Look at real installer script and take inspiration from it
# @see https://github.com/nvm-sh/nvm/blob/master/README.md
#> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
#> wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

cd /usr/bin

#echo 'npx ptbk "$@"' > ptbk
echo 'ts-node ~/work/ai/promptbook/src/cli/test/ptbk.ts "$@"' > ptbk

echo 'Promptbook CLI installed successfully!'