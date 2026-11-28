#!/usr/bin/env node
//               <- TODO: [🎺] Ensure correct version of Node.js is used
// promptbook-cli-proxy.js

/**
 * Note: [🔺] Purpose of this file is to forward `ptbk` package launches to `@promptbook/cli`
 */

const { dirname } = require('path');

// Resolve through `promptbook` so the proxy works for both hoisted and nested installs.
const promptbookPackageRoot = dirname(require.resolve('promptbook/package.json'));
const promptbookCliEntrypoint = require.resolve('@promptbook/cli/bin/promptbook-cli.js', {
    paths: [promptbookPackageRoot, __dirname],
});

require(promptbookCliEntrypoint);
