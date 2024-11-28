import { DoesNotMakeSenseError } from '../../errors/DoesNotMakeSenseError';
import { getLowestCommonCompatibility } from './getLowestCommonCompatibility';

describe('getLowestCommonCompatibility', () => {
    it('should return IDENTICAL_INTERFACE when passed IDENTICAL_INTERFACE', () => {
        const result = getLowestCommonCompatibility('IDENTICAL_INTERFACE');
        expect(result).toBe('IDENTICAL_INTERFACE');
    });

    it('should return INTERSECTING when passed IDENTICAL_NAMES and INTERSECTING', () => {
        const result = getLowestCommonCompatibility('IDENTICAL_NAMES', 'INTERSECTING');
        expect(result).toBe('INTERSECTING');
    });

    it('should return NON_INTERSECTING when passed NON_INTERSECTING and INTERSECTING', () => {
        const result = getLowestCommonCompatibility('NON_INTERSECTING', 'INTERSECTING');
        expect(result).toBe('NON_INTERSECTING');
    });

    it('should return INTERSECTING when passed multiple compatibilities', () => {
        const result = getLowestCommonCompatibility(
            'IDENTICAL_NAMES',
            'IDENTICAL_INTERFACE',
            'INTERSECTING',
            'IDENTICAL_NAMES',
        );
        expect(result).toBe('INTERSECTING');
    });

    it('should throw DoesNotMakeSenseError when called with no arguments', () => {
        expect(() => getLowestCommonCompatibility()).toThrow(DoesNotMakeSenseError);
    });
});
