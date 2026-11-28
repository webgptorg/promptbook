import { EventEmitter } from 'events';
import { createInterface } from 'readline';
import { createPlanningTerminal } from './createPlanningTerminal';

jest.mock('readline', () => ({ createInterface: jest.fn() }));

describe('planning terminal lifecycle', () => {
    it.each(['close', 'SIGINT'])('releases pending input and cancels inference on %s', async (event) => {
        const inputDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
        const outputDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
        Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
        Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
        const reader = Object.assign(new EventEmitter(), { close: jest.fn(), setPrompt: jest.fn(), prompt: jest.fn() });
        jest.mocked(createInterface).mockReturnValue(reader as unknown as ReturnType<typeof createInterface>);
        const terminal = createPlanningTerminal();
        try {
            const pending = terminal.readMessage();
            reader.emit(event);
            await expect(pending).resolves.toBeUndefined();
            expect(terminal.signal.aborted).toBe(true);
            await expect(terminal.readMessage()).resolves.toBeUndefined();
        } finally {
            terminal.close();
            if (inputDescriptor) Object.defineProperty(process.stdin, 'isTTY', inputDescriptor);
            else Reflect.deleteProperty(process.stdin, 'isTTY');
            if (outputDescriptor) Object.defineProperty(process.stdout, 'isTTY', outputDescriptor);
            else Reflect.deleteProperty(process.stdout, 'isTTY');
        }
    });
});
