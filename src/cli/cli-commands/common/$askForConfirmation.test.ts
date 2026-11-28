import { $askForConfirmation } from './$askForConfirmation';

describe('$askForConfirmation', () => {
    const originalStandardInputIsTtyDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');

    afterEach(() => {
        if (originalStandardInputIsTtyDescriptor === undefined) {
            Reflect.deleteProperty(process.stdin, 'isTTY');
        } else {
            Object.defineProperty(process.stdin, 'isTTY', originalStandardInputIsTtyDescriptor);
        }
    });

    it('declines without reading the terminal when the questions are disabled', async () => {
        Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });

        await expect($askForConfirmation('Install it now?', { isAskingQuestionsEnabled: false })).resolves.toBe(false);
    });

    it('declines when the terminal is not interactive', async () => {
        Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });

        await expect($askForConfirmation('Install it now?', { isAskingQuestionsEnabled: true })).resolves.toBe(false);
    });
});

// Note: [🟡] Code for CLI confirmation tests [$askForConfirmation.test](src/cli/cli-commands/common/$askForConfirmation.test.ts) should never be published outside of `@promptbook/cli`
