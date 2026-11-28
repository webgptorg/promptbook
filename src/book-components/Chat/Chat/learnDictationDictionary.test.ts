import { learnDictationDictionary } from './learnDictationDictionary';

describe('learnDictationDictionary', () => {
    it('learns corrected custom words including capitalization-only corrections', () => {
        expect(learnDictationDictionary('promptbook flow', 'Promptbook Flow', {})).toEqual({
            promptbook: 'Promptbook',
            flow: 'Flow',
        });
    });

    it('keeps the previous dictionary when correction word counts differ', () => {
        expect(learnDictationDictionary('prompt book', 'Promptbook', { agent: 'Agent' })).toEqual({
            agent: 'Agent',
        });
    });
});
