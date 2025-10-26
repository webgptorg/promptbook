#!/usr/bin/env node

const { exec } = require('child_process');

const port = process.env.PORT || 1234;

exec(`npx y-websocket-server --port ${port}`, (err, stdout, stderr) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(stdout);
    console.error(stderr);
});

console.log(`y-websocket server running on port ${port}`);

/**
 * TODO: !!!! Integrate this into the structure of the project
 */
