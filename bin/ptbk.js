#!/usr/bin/env node
/** Runs the compiled CLI from either a local or global npm installation. */
import('../dist/coder/cli.js')
    .then(async ({ main }) => { process.exitCode = await main(process.argv.slice(2)); })
    .catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
