import { describe, expect, it } from '@jest/globals';
import { resolveTaskTldr } from './resolveTaskTldr';

describe('resolveTaskTldr', () => {
    it('should prefer a custom TLDR when available', () => {
        expect(
            resolveTaskTldr({
                customTldr: {
                    percent: 0.25,
                    message: 'Custom progress',
                },
                currentValue: {},
                status: 'RUNNING',
                createdAt: new Date(),
                errors: [],
                warnings: [],
            }),
        ).toEqual({
            percent: 0.25,
            message: 'Custom progress',
        });
    });

    it('should reuse explicit progress and message from the current task value', () => {
        expect(
            resolveTaskTldr({
                customTldr: null,
                currentValue: {
                    tldr: {
                        percent: 2,
                        message: 'Halfway there',
                    },
                },
                status: 'RUNNING',
                createdAt: new Date(),
                errors: [],
                warnings: [],
            }),
        ).toEqual({
            percent: 1,
            message: 'Halfway there (!!!fallback)',
        });
    });

    it('should describe the first unfinished subtask when no message is available', () => {
        expect(
            resolveTaskTldr({
                customTldr: null,
                currentValue: {
                    subtasks: [{ title: 'First', done: true }, { title: 'Second' }],
                },
                status: 'RUNNING',
                createdAt: new Date(),
                errors: [],
                warnings: [],
            }).message,
        ).toBe('Working on Second (!!!fallback)');
    });

    it('should force finished tasks to 100 percent when progress is simulated', () => {
        expect(
            resolveTaskTldr({
                customTldr: null,
                currentValue: {},
                status: 'FINISHED',
                createdAt: new Date(0),
                errors: [],
                warnings: [],
            }),
        ).toEqual({
            percent: 1,
            message: 'Finished (!!!fallback)',
        });
    });

    it('should surface the latest error message before the status fallback', () => {
        expect(
            resolveTaskTldr({
                customTldr: null,
                currentValue: {},
                status: 'ERROR',
                createdAt: new Date(),
                errors: [new Error('Older problem'), new Error('Newest problem')],
                warnings: [],
            }),
        ).toEqual({
            percent: 0,
            message: 'Newest problem (!!!fallback)',
        });
    });
});
