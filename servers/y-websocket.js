#!/usr/bin/env node

const { spawn } = require('child_process');

const port = process.env.PORT || '4461';
const cmd = 'npx';
const args = ['y-websocket-server', '--port', String(port)];

console.log(`Running command: ${cmd} ${args.join(' ')}`);

// spawn instead of exec so we can proxy raw STDIO and see why it fails
const child = spawn(cmd, args, {
    // keep PATH/env so npx can be resolved
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
});

// proxy live output to parent process (raw STDIO)
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

// capture raw output for post-mortem
let rawStdout = '';
let rawStderr = '';
child.stdout.on('data', (d) => {
    rawStdout += d.toString();
});
child.stderr.on('data', (d) => {
    rawStderr += d.toString();
});

child.on('error', (err) => {
    console.error('Failed to start command. Error object:');
    console.error(err);
    // helpful hint if the binary isn't found
    if (err.code === 'ENOENT') {
        console.error('ENOENT: command not found. Is npx installed and on PATH?');
    }
    if (rawStdout) console.error('Captured stdout before error:\n' + rawStdout);
    if (rawStderr) console.error('Captured stderr before error:\n' + rawStderr);
    process.exitCode = 1;
});

child.on('close', (code, signal) => {
    if (code === 0) {
        console.log(`y-websocket server exited normally with code ${code}`);
    } else {
        console.error(`y-websocket server exited with code=${code} signal=${signal}`);
        // Mirror the shape of the error shown by exec() so it's easy to compare
        console.error({
            code,
            killed: child.killed || false,
            signal: signal,
            cmd: `${cmd} ${args.join(' ')}`,
        });
        if (rawStdout) console.error('Collected stdout:\n' + rawStdout);
        if (rawStderr) console.error('Collected stderr:\n' + rawStderr);
    }
});

/**
 * TODO: !!!! Integrate this into the structure of the project
 */
