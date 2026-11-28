// Offline coding harness. Capture exactly what the installed CLI supplied, including the shell's -C argument.
const FILESYSTEM = require('fs');
const PATH = require('path');
const ARGUMENTS = process.argv.slice(2);
if (ARGUMENTS.includes('--version')) {
    process.stdout.write('codex-cli 0.0.0\n');
    process.exit(0);
}
if (ARGUMENTS[0] === 'login') {
    process.stdout.write('Logged in using ChatGPT\n');
    process.exit(0);
}
if (!ARGUMENTS.includes('exec')) process.exit(2);
let prompt = '';
process.stdin.on('data', (chunk) => { prompt += chunk; });
process.stdin.on('end', () => {
    const projectPath = ARGUMENTS[ARGUMENTS.indexOf('-C') + 1];
    if (PATH.resolve(projectPath) !== process.cwd()) {
        process.stderr.write(`Wrong project argument: ${projectPath}; cwd: ${process.cwd()}\n`);
        process.exitCode = 2;
        return;
    }
    FILESYSTEM.mkdirSync('.promptbook', { recursive: true });
    FILESYSTEM.writeFileSync('.promptbook/mock-call.json', JSON.stringify({ projectPath, cwd: process.cwd(), prompt }));
    process.stdout.write('Offline fixture completed.\ntokens used\n0\n');
});
