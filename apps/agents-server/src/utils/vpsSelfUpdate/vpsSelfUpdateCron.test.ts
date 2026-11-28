import { describe, expect, it } from '@jest/globals';
import {
    DEFAULT_VPS_SELF_UPDATE_CRON_EXPRESSION,
    normalizeVpsSelfUpdateCronExpression,
    resolveNextVpsSelfUpdateCronRun,
} from './vpsSelfUpdateCron';

describe('vpsSelfUpdateCron', () => {
    it('uses the default daily midnight cron expression for empty values', () => {
        expect(normalizeVpsSelfUpdateCronExpression('')).toBe(DEFAULT_VPS_SELF_UPDATE_CRON_EXPRESSION);
    });

    it('resolves the next daily midnight run', () => {
        const nextRun = resolveNextVpsSelfUpdateCronRun('0 0 * * *', new Date(2026, 0, 1, 10, 15, 20));

        expect(nextRun.getFullYear()).toBe(2026);
        expect(nextRun.getMonth()).toBe(0);
        expect(nextRun.getDate()).toBe(2);
        expect(nextRun.getHours()).toBe(0);
        expect(nextRun.getMinutes()).toBe(0);
        expect(nextRun.getSeconds()).toBe(0);
    });

    it('supports lists, ranges, and step values', () => {
        const nextRun = resolveNextVpsSelfUpdateCronRun('*/15 9-17 * * 1-5', new Date(2026, 0, 5, 9, 7, 0));

        expect(nextRun.getFullYear()).toBe(2026);
        expect(nextRun.getMonth()).toBe(0);
        expect(nextRun.getDate()).toBe(5);
        expect(nextRun.getHours()).toBe(9);
        expect(nextRun.getMinutes()).toBe(15);
    });

    it('rejects cron expressions without five fields', () => {
        expect(() => normalizeVpsSelfUpdateCronExpression('0 0 *')).toThrow('Use exactly five fields');
    });
});
