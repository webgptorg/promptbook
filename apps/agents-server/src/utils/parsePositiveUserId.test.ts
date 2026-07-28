import { parsePositiveUserId } from './parsePositiveUserId';

describe('parsePositiveUserId', () => {
    it('returns positive ids and rejects invalid values', () => {
        expect(parsePositiveUserId('42')).toBe(42);
        expect(parsePositiveUserId('0')).toBeNull();
        expect(parsePositiveUserId('-1')).toBeNull();
        expect(parsePositiveUserId('42abc')).toBeNull();
        expect(parsePositiveUserId('not-a-number')).toBeNull();
        expect(parsePositiveUserId(null)).toBeNull();
    });
});
