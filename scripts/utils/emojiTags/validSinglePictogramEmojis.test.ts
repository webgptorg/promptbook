import { isValidSinglePictogramEmoji, VALID_SINGLE_PICTOGRAM_EMOJIS } from './validSinglePictogramEmojis';

describe('VALID_SINGLE_PICTOGRAM_EMOJIS', () => {
    it('contains only Unicode emoji-presentation pictograms', () => {
        for (const emoji of VALID_SINGLE_PICTOGRAM_EMOJIS) {
            expect(isValidSinglePictogramEmoji(emoji)).toBe(true);
        }
    });

    it('excludes legacy symbols that are not valid emoji', () => {
        expect(isValidSinglePictogramEmoji('𓀙')).toBe(false);
        expect(isValidSinglePictogramEmoji('⚇')).toBe(false);
        expect(isValidSinglePictogramEmoji('✢')).toBe(false);
    });
});
