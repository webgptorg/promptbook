#!/usr/bin/env node

console.log('Hello from promptbook-cli.js!');

const {
    __: { prettifyPromptbookStringCli },
} = require('../umd/index.umd.js');

prettifyPromptbookStringCli();
