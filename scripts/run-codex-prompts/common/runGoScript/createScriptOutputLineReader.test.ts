import { createScriptOutputLineReader } from './createScriptOutputLineReader';

describe('createScriptOutputLineReader', () => {
    it('returns only the lines which are already terminated', () => {
        const lineReader = createScriptOutputLineReader();

        expect(lineReader.readCompletedLines('first\nsecond\nthi')).toEqual(['first', 'second']);
    });

    it('joins one line which was split across two chunks', () => {
        const lineReader = createScriptOutputLineReader();

        lineReader.readCompletedLines('{"type":"rate_limit');
        expect(lineReader.readCompletedLines('_event"}\n')).toEqual(['{"type":"rate_limit_event"}']);
    });

    it('reads Windows line endings as line terminators', () => {
        const lineReader = createScriptOutputLineReader();

        expect(lineReader.readCompletedLines('first\r\nsecond\r\n')).toEqual(['first', 'second']);
    });

    it('completes no line while the chunk carries no line ending', () => {
        const lineReader = createScriptOutputLineReader();

        expect(lineReader.readCompletedLines('partial')).toEqual([]);
    });

    it('keeps two streams apart when each of them has its own reader', () => {
        const standardOutputLineReader = createScriptOutputLineReader();
        const standardErrorLineReader = createScriptOutputLineReader();

        standardOutputLineReader.readCompletedLines('out-');
        standardErrorLineReader.readCompletedLines('err-');

        expect(standardOutputLineReader.readCompletedLines('line\n')).toEqual(['out-line']);
        expect(standardErrorLineReader.readCompletedLines('line\n')).toEqual(['err-line']);
    });
});
