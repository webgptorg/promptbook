import { normalizePriorityFilter } from './priorityFilter';

describe('normalizePriorityFilter', () => {
    it('normalizes the legacy priority alias as the minimum priority', () => {
        expect(normalizePriorityFilter({ priority: 3 })).toEqual({ minimumPriority: 3 });
    });

    it('normalizes inclusive minimum and maximum priority boundaries', () => {
        expect(normalizePriorityFilter({ minimumPriority: 1, maximumPriority: 5 })).toEqual({
            minimumPriority: 1,
            maximumPriority: 5,
        });
    });

    it('treats minimum priority zero as an absent lower bound', () => {
        expect(normalizePriorityFilter({ minimumPriority: 0, maximumPriority: 5 })).toEqual({
            maximumPriority: 5,
        });
    });

    it('rejects conflicting priority alias values', () => {
        expect(() => normalizePriorityFilter({ priority: 2, minimumPriority: 3 })).toThrow(
            'Conflicting priority range options',
        );
    });

    it('rejects invalid priority ranges', () => {
        expect(() => normalizePriorityFilter({ minimumPriority: 5, maximumPriority: 1 })).toThrow(
            'Invalid priority range',
        );
    });

    it('rejects non-integer priority boundaries', () => {
        expect(() => normalizePriorityFilter({ minimumPriority: 1.5 })).toThrow('Invalid value for `--min-priority`');
        expect(() => normalizePriorityFilter({ maximumPriority: 2.5 })).toThrow('Invalid value for `--max-priority`');
    });
});
