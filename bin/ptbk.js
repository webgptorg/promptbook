#!/usr/bin/env node

/** Load the runtime relative to this installation, independently of the project directory. */
import('../dist/cli.js').then(({ main }) => main()).catch((error) => {
    process.stderr.write(`ptbk: ${error.message}\n`);
    process.exitCode = 1;
});
