// Subprocess-only fixture: machine disk pressure is not an input to CLI parsing/repair smoke tests.
// The production disk guard and its dedicated unit tests retain the real thresholds.
const FILE_SYSTEM_PROMISES = require('fs/promises');
FILE_SYSTEM_PROMISES.statfs = async () => ({ bsize: 4096, bavail: 10000000, blocks: 20000000 });
