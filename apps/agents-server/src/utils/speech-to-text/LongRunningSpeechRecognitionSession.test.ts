import type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionStartOptions } from '../../../../../src/types/SpeechRecognition';
import { LongRunningSpeechRecognitionSession } from './LongRunningSpeechRecognitionSession';

/**
 * Controllable in-memory recognition double used by wrapper tests.
 */
class FakeSpeechRecognition implements SpeechRecognition {
    private callbacks: Array<(event: SpeechRecognitionEvent) => void> = [];

    public readonly stop = jest.fn();
    public readonly start = jest.fn();
    public state = 'IDLE' as const;

    public $start(startOptions: SpeechRecognitionStartOptions): void {
        this.start(startOptions);
    }

    public $stop(): void {
        this.stop();
    }

    public subscribe(callback: (event: SpeechRecognitionEvent) => void): () => void {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter((registeredCallback) => registeredCallback !== callback);
        };
    }

    /**
     * Emits one synthetic event to all subscribers.
     */
    public emit(event: SpeechRecognitionEvent): void {
        for (const callback of this.callbacks) {
            callback(event);
        }
    }
}

describe('LongRunningSpeechRecognitionSession', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('restarts after an unexpected stop without exposing an outer STOP event', () => {
        const recognitions: Array<FakeSpeechRecognition> = [];
        const createRecognition = jest.fn(() => {
            const recognition = new FakeSpeechRecognition();
            recognitions.push(recognition);
            return recognition;
        });

        const sessionEvents: string[] = [];
        const events: Array<SpeechRecognitionEvent> = [];
        const session = new LongRunningSpeechRecognitionSession({
            createRecognition,
            restartDelayMs: 1,
            onSessionEvent: (event) => {
                sessionEvents.push(event.type === 'restart' ? `restart:${event.restartCount}` : event.type);
            },
        });

        session.subscribe((event) => {
            events.push(event);
        });

        session.$start({ language: 'en-US' });
        recognitions[0]!.emit({ type: 'START' });
        recognitions[0]!.emit({ type: 'STOP' });

        expect(events).toEqual([{ type: 'START' }]);
        expect(sessionEvents).toEqual(['restart:1']);

        jest.runAllTimers();

        expect(createRecognition).toHaveBeenCalledTimes(2);
    });

    it('deduplicates overlap against finalized chunks after a restart', () => {
        const recognitions: Array<FakeSpeechRecognition> = [];
        const session = new LongRunningSpeechRecognitionSession({
            createRecognition: () => {
                const recognition = new FakeSpeechRecognition();
                recognitions.push(recognition);
                return recognition;
            },
            restartDelayMs: 1,
        });

        const events: Array<SpeechRecognitionEvent> = [];
        session.subscribe((event) => {
            events.push(event);
        });

        session.$start({ language: 'en-US' });
        recognitions[0]!.emit({ type: 'START' });
        recognitions[0]!.emit({ type: 'RESULT', text: 'Hello world', isFinal: true });
        recognitions[0]!.emit({ type: 'STOP' });
        jest.runAllTimers();
        recognitions[1]!.emit({ type: 'START' });
        recognitions[1]!.emit({ type: 'RESULT', text: 'Hello world again and again', isFinal: false });

        expect(session.finalChunks).toEqual(['Hello world']);
        expect(session.partialText).toBe('again and again');
        expect(events).toEqual([
            { type: 'START' },
            { type: 'RESULT', text: 'Hello world', isFinal: true },
            { type: 'START' },
            { type: 'RESULT', text: 'again and again', isFinal: false },
        ]);
    });

    it('stops immediately and prevents any further restart scheduling', () => {
        const recognitions: Array<FakeSpeechRecognition> = [];
        const createRecognition = jest.fn(() => {
            const recognition = new FakeSpeechRecognition();
            recognitions.push(recognition);
            return recognition;
        });

        const events: Array<SpeechRecognitionEvent> = [];
        const session = new LongRunningSpeechRecognitionSession({
            createRecognition,
            restartDelayMs: 1,
        });

        session.subscribe((event) => {
            events.push(event);
        });

        session.$start({ language: 'en-US' });
        session.$stop();
        recognitions[0]!.emit({ type: 'STOP' });
        jest.runAllTimers();

        expect(createRecognition).toHaveBeenCalledTimes(1);
        expect(recognitions[0]!.stop).toHaveBeenCalledTimes(1);
        expect(events).toEqual([{ type: 'STOP' }]);
    });

    it('flushes the active final chunk before emitting the outer STOP event', () => {
        const recognitions: Array<FakeSpeechRecognition> = [];
        const session = new LongRunningSpeechRecognitionSession({
            createRecognition: () => {
                const recognition = new FakeSpeechRecognition();
                recognitions.push(recognition);
                return recognition;
            },
        });

        const events: Array<SpeechRecognitionEvent> = [];
        session.subscribe((event) => {
            events.push(event);
        });

        session.$start({ language: 'en-US' });
        recognitions[0]!.emit({ type: 'START' });

        session.$stop();
        recognitions[0]!.emit({ type: 'RESULT', text: 'Finishing the sentence', isFinal: true });
        recognitions[0]!.emit({ type: 'STOP' });

        expect(events).toEqual([
            { type: 'START' },
            { type: 'RESULT', text: 'Finishing the sentence', isFinal: true },
            { type: 'STOP' },
        ]);
        expect(session.finalChunks).toEqual(['Finishing the sentence']);
    });

    it('forwards recent finalized transcript text as transcription prompt on the next cycle', () => {
        const recognitions: Array<FakeSpeechRecognition> = [];
        const session = new LongRunningSpeechRecognitionSession({
            createRecognition: () => {
                const recognition = new FakeSpeechRecognition();
                recognitions.push(recognition);
                return recognition;
            },
            restartDelayMs: 1,
        });

        session.$start({ language: 'en-US' });
        recognitions[0]!.emit({ type: 'START' });
        recognitions[0]!.emit({ type: 'RESULT', text: 'Hello world', isFinal: true });
        recognitions[0]!.emit({ type: 'STOP' });
        jest.runAllTimers();

        expect(recognitions[0]!.start).toHaveBeenCalledWith({
            language: 'en-US',
            transcriptionPrompt: undefined,
        });
        expect(recognitions[1]!.start).toHaveBeenCalledWith({
            language: 'en-US',
            transcriptionPrompt: 'Hello world',
        });
    });

    it('does not restart after a terminal error', () => {
        const recognitions: Array<FakeSpeechRecognition> = [];
        const createRecognition = jest.fn(() => {
            const recognition = new FakeSpeechRecognition();
            recognitions.push(recognition);
            return recognition;
        });

        const session = new LongRunningSpeechRecognitionSession({
            createRecognition,
            restartDelayMs: 1,
        });

        const events: Array<SpeechRecognitionEvent> = [];
        session.subscribe((event) => {
            events.push(event);
        });

        session.$start({ language: 'en-US' });
        recognitions[0]!.emit({
            type: 'ERROR',
            message: 'Permission denied',
            code: 'permission-denied',
            canRetry: true,
            canOpenBrowserSettings: true,
        });
        recognitions[0]!.emit({ type: 'STOP' });
        jest.runAllTimers();

        expect(createRecognition).toHaveBeenCalledTimes(1);
        expect(events).toEqual([
            {
                type: 'ERROR',
                message: 'Permission denied',
                code: 'permission-denied',
                canRetry: true,
                canOpenBrowserSettings: true,
            },
            { type: 'STOP' },
        ]);
    });
});
