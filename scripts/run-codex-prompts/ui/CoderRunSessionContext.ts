import type { CoderRunOutputSource, CoderRunSession } from './CoderRunSession';

/**
 * Mutable process-wide coding-run session used by shared logging helpers.
 */
let currentCoderRunSession: CoderRunSession | undefined;

/**
 * Registers the currently active coding-run session.
 */
export function setCurrentCoderRunSession(coderRunSession: CoderRunSession | undefined): void {
    currentCoderRunSession = coderRunSession;
}

/**
 * Returns the currently active coding-run session when present.
 */
export function getCurrentCoderRunSession(): CoderRunSession | undefined {
    return currentCoderRunSession;
}

/**
 * Reports one informational line either to the active session or to the raw console.
 */
export function coderRunInfo(message: string): void {
    if (currentCoderRunSession) {
        currentCoderRunSession.logger.info(message);
        return;
    }

    console.info(message);
}

/**
 * Reports one warning line either to the active session or to the raw console.
 */
export function coderRunWarn(message: string): void {
    if (currentCoderRunSession) {
        currentCoderRunSession.logger.warn(message);
        return;
    }

    console.warn(message);
}

/**
 * Reports one error line either to the active session or to the raw console.
 */
export function coderRunError(message: string): void {
    if (currentCoderRunSession) {
        currentCoderRunSession.logger.error(message);
        return;
    }

    console.error(message);
}

/**
 * Reports raw runner output either to the active session or to the raw console.
 */
export function coderRunRawOutput(chunk: string, source: CoderRunOutputSource): void {
    if (currentCoderRunSession) {
        currentCoderRunSession.logger.rawOutput(chunk, source);
        return;
    }

    if (source === 'stderr') {
        if (chunk.trim()) {
            console.warn(chunk);
        }
        return;
    }

    console.info(chunk);
}
