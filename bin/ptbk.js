#!/usr/bin/env node

/** Load the runtime relative to this installation, independently of the project directory. */
import('../dist/cli.js').then(async ({ main }) => {
    if (await main() === 'foreground-ended') {
        // Let final output drain naturally. A leftover provider handle cannot hold a stopped service open.
        setTimeout(() => process.exit(process.exitCode ?? 0), 1000).unref();
    }
}).catch((error) => {
    process.stderr.write(`ptbk: ${error.message}\n`);
    process.exitCode = 1;
});
