const fs = require('fs');

/** Offline harness recording, teeing the original output just like the shell boundary it replaces. */
const RECORDING = fs.readFileSync('recording.jsonl', 'utf8');
fs.appendFileSync(process.argv[2], RECORDING);
fs.writeFileSync('result.txt', 'observable file change\n');
process.stdout.write(RECORDING);
