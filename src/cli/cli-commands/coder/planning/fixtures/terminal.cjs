// Test-only terminal adapter. Production still requires a real TTY and exposes no input-bypass flag.
const { EventEmitter } = require('events');
const readline = require('readline');
const ORIGINAL_CREATE_INTERFACE = readline.createInterface;
const CONVERSATION = require(process.env.PTBK_PLANNER_TEST_FIXTURE);
Object.defineProperty(process.stdin, 'isTTY', { value: true });
Object.defineProperty(process.stdout, 'isTTY', { value: true });
readline.createInterface = (options) => {
    if (options.input !== process.stdin) return ORIGINAL_CREATE_INTERFACE(options);
    const reader = new EventEmitter();
    let index = 0;
    let isClosed = false;
    reader.setPrompt = () => undefined;
    reader.prompt = () =>
        setImmediate(() => {
            const entry = CONVERSATION[index++];
            if (entry) reader.emit('line', entry.user);
            else reader.close();
        });
    reader.close = () => {
        if (isClosed) return;
        isClosed = true;
        reader.emit('close');
    };
    return reader;
};
