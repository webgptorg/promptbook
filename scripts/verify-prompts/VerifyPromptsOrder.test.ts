import { DEFAULT_VERIFY_PROMPTS_ORDER, parseVerifyPromptsOrder } from './VerifyPromptsOrder';

describe('parseVerifyPromptsOrder', () => {
    it('falls back to `from-earliest` when no order is given', () => {
        expect(parseVerifyPromptsOrder(undefined)).toBe('from-earliest');
        expect(DEFAULT_VERIFY_PROMPTS_ORDER).toBe('from-earliest');
    });

    it('accepts every supported order', () => {
        expect(parseVerifyPromptsOrder('from-earliest')).toBe('from-earliest');
        expect(parseVerifyPromptsOrder('from-latest')).toBe('from-latest');
        expect(parseVerifyPromptsOrder('random')).toBe('random');
    });

    it('throws a branded NotAllowed error for an unsupported order', () => {
        expect(() => parseVerifyPromptsOrder('reverse')).toThrow(expect.objectContaining({ name: 'NotAllowed' }));
        expect(() => parseVerifyPromptsOrder('reverse')).toThrow(/from-latest/);
    });
});
