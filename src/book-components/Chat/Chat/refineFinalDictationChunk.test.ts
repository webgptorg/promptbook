import type { DictationRefinementSettings } from './refineFinalDictationChunk';
import { refineFinalDictationChunk } from './refineFinalDictationChunk';

const DEFAULT_TEST_SETTINGS: DictationRefinementSettings = {
    autoPunctuation: true,
    autoCapitalization: true,
    removeFillerWords: true,
    formatLists: true,
    whisperMode: false,
};

describe('refineFinalDictationChunk', () => {
    it('applies dictionary words, filler cleanup, list commands, capitalization, and punctuation', () => {
        expect(
            refineFinalDictationChunk('um hello new line bullet promptbook', DEFAULT_TEST_SETTINGS, {
                promptbook: 'Promptbook',
            }),
        ).toBe('Hello\n- Promptbook.');
    });

    it('keeps optional filler cleanup disabled by default', () => {
        expect(
            refineFinalDictationChunk(
                'um hello',
                {
                    ...DEFAULT_TEST_SETTINGS,
                    removeFillerWords: false,
                },
                {},
            ),
        ).toBe('Um hello.');
    });
});
