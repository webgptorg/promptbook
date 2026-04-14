import type { CoderRunSession, CoderRunSessionOptions } from './CoderRunSession';
import { ConsoleCoderRunSession } from './ConsoleCoderRunSession';
import { InkCoderRunSession } from './InkCoderRunSession';

/**
 * Creates either the Ink terminal UI or the legacy console reporter depending on terminal support.
 */
export function createCoderRunSession(options: CoderRunSessionOptions): CoderRunSession {
    if (options.runOptions.isTerminalUiEnabled && process.stdin.isTTY && process.stdout.isTTY) {
        return new InkCoderRunSession(options);
    }

    return new ConsoleCoderRunSession(options);
}
