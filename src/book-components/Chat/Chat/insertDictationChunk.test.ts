import { insertDictationChunk } from './insertDictationChunk';

describe('insertDictationChunk', () => {
    it('inserts dictated text at the caret with a separating space', () => {
        expect(
            insertDictationChunk({
                currentValue: 'Hello',
                dictatedText: 'world.',
                selectionStart: 5,
                selectionEnd: 5,
                isReplacingSelection: false,
            }),
        ).toEqual({
            nextValue: 'Hello world.',
            start: 6,
            caret: 12,
        });
    });

    it('replaces the selected text when dictation starts with a selection', () => {
        expect(
            insertDictationChunk({
                currentValue: 'Hello old text.',
                dictatedText: 'new text.',
                selectionStart: 6,
                selectionEnd: 15,
                isReplacingSelection: true,
            }),
        ).toEqual({
            nextValue: 'Hello new text.',
            start: 6,
            caret: 15,
        });
    });
});
