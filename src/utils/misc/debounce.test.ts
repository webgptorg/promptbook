import { describe, expect, it, jest } from '@jest/globals';
import { debounce } from './debounce';

describe('how debounce works', () => {
    it('runs once with the latest arguments after the delay', () => {
        jest.useFakeTimers();

        try {
            const onDebounced = jest.fn();
            const debounced = debounce(onDebounced, 1_000);

            debounced('first value');
            jest.advanceTimersByTime(500);
            debounced('latest value');
            jest.advanceTimersByTime(999);

            expect(onDebounced).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1);

            expect(onDebounced).toHaveBeenCalledTimes(1);
            expect(onDebounced).toHaveBeenCalledWith('latest value');
        } finally {
            jest.useRealTimers();
        }
    });

    it('can cancel a pending execution', () => {
        jest.useFakeTimers();

        try {
            const onDebounced = jest.fn();
            const debounced = debounce(onDebounced, 1_000);

            debounced();
            debounced.cancel();
            jest.advanceTimersByTime(1_000);

            expect(onDebounced).not.toHaveBeenCalled();
        } finally {
            jest.useRealTimers();
        }
    });
});
