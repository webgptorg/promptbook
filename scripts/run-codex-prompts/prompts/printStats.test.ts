import { printStats } from './printStats';

describe('printStats', () => {
    let consoleInfoSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleInfoSpy.mockRestore();
    });

    it('keeps the original format when minimum priority is not set', () => {
        printStats({ done: 85, forAgent: 5, outsidePriorityRange: 0, toBeWritten: 16 });

        expect(String(consoleInfoSpy.mock.calls[0]![0])).toContain('Done: 85 | For agent: 5 | To be written: 16');
    });

    it('prints the priority segment when minimum priority is set', () => {
        printStats({ done: 85, forAgent: 3, outsidePriorityRange: 2, toBeWritten: 10 }, { minimumPriority: 4 });

        expect(String(consoleInfoSpy.mock.calls[0]![0])).toContain(
            'Done: 85 | For agent: 3 | Priority <4: 2 | To be written: 10',
        );
    });

    it('prints the priority range segment when both bounds are set', () => {
        printStats(
            { done: 85, forAgent: 3, outsidePriorityRange: 2, toBeWritten: 10 },
            { minimumPriority: 1, maximumPriority: 5 },
        );

        expect(String(consoleInfoSpy.mock.calls[0]![0])).toContain(
            'Done: 85 | For agent: 3 | Priority outside 1-5: 2 | To be written: 10',
        );
    });
});
