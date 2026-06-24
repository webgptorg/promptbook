import moment from 'moment';
import { formatServerLanguageHumanReadableDate } from './formatServerLanguageHumanReadableDate';

/**
 * Stable current time used by relative-date formatter tests.
 */
const TEST_NOW_TIMESTAMP = new Date('2026-06-24T12:00:00.000Z').getTime();

describe('formatServerLanguageHumanReadableDate', () => {
    const originalMomentNow = moment.now;

    beforeEach(() => {
        moment.now = () => TEST_NOW_TIMESTAMP;
    });

    afterAll(() => {
        moment.now = originalMomentNow;
    });

    it('formats English timestamps as relative human-readable labels', () => {
        expect(formatServerLanguageHumanReadableDate('2026-06-22T12:00:00.000Z', 'en')).toBe('2 days ago');
    });

    it('formats Czech timestamps according to the active UI language', () => {
        expect(formatServerLanguageHumanReadableDate('2026-06-22T12:00:00.000Z', 'cs')).toBe('před 2 dny');
    });

    it('can include localized exact date context', () => {
        expect(
            formatServerLanguageHumanReadableDate('2026-06-22T12:00:00.000Z', 'en', {
                isExactDateIncluded: true,
            }),
        ).toMatch(/^2 days ago \(.+\)$/);
    });

    it('falls back for missing values and preserves invalid string values', () => {
        expect(formatServerLanguageHumanReadableDate(null, 'en', { fallbackLabel: '-' })).toBe('-');
        expect(formatServerLanguageHumanReadableDate('not-a-date', 'en', { fallbackLabel: '-' })).toBe('not-a-date');
    });
});
