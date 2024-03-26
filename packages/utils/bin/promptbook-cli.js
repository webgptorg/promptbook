#!/usr/bin/env node

console.log('Hello from promptbook-cli.js!');

const colors = require('colors');
const {
    __: { prettifyPromptbookStringCli },
} = require('../umd/index.umd.js');

prettifyPromptbookStringCli();


/**
 * TODO: [🕌] When more functionalities, rename
 */
