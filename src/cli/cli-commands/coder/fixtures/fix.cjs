// Deterministic offline harness for the installed CLI check-repair contract.
const FILESYSTEM = require('fs');
const PATH = require('path');
const ARGUMENTS = process.argv.slice(2);
if (ARGUMENTS.includes('--version')) {
    process.stdout.write('codex-cli 0.0.0\n');
    process.exit(0);
}
FILESYSTEM.mkdirSync('.promptbook', { recursive: true });
FILESYSTEM.appendFileSync('.promptbook/harness-invocations', `${ARGUMENTS.join(' ')}\n`);
if (ARGUMENTS[0] === 'login') {
    process.stdout.write('Logged in using ChatGPT\n');
    process.exit(0);
}
if (!ARGUMENTS.includes('exec')) process.exit(2);
let prompt = '';
process.stdin.on('data', (chunk) => { prompt += chunk; });
process.stdin.on('end', () => {
    const projectPath = ARGUMENTS[ARGUMENTS.indexOf('-C') + 1];
    if (PATH.resolve(projectPath) !== process.cwd() || prompt.includes('FORBIDDEN_') ||
        !prompt.includes('Fix the existing project check failures only.')) {
        process.stderr.write('Fixture received wrong project or ordinary task.\n');
        process.exitCode = 2;
        return;
    }
    FILESYSTEM.writeFileSync('.promptbook/mock-call.json', JSON.stringify({ projectPath, prompt }));
    if (!FILESYSTEM.existsSync('.promptbook/keep-failing')) FILESYSTEM.writeFileSync('value.txt', 'fixed');
    process.stdout.write('Verified correction fixture completed.\ntokens used\n0\n');
});
