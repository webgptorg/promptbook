import type { SpeechRecognitionEvent } from '../../../../../src/types/SpeechRecognition';
import { SpeechToTextFailoverRecognition } from './SpeechToTextFailoverRecognition';
import type {
    SpeechToTextProvider,
    SpeechToTextProviderDiagnostics,
    SpeechToTextProviderError,
    SpeechToTextProviderId,
    SpeechToTextProviderStartOptions,
} from './SpeechToTextProvider';

type FakeSpeechToTextProviderOptions = {
    readonly id: SpeechToTextProviderId;
    readonly isSupported?: boolean;
    readonly supportsPartials?: boolean;
    readonly start?: (options: SpeechToTextProviderStartOptions) => Promise<void> | void;
};

class FakeSpeechToTextProvider implements SpeechToTextProvider {
    public readonly id: SpeechToTextProviderId;
    public readonly startMock = jest.fn<Promise<void> | void, [SpeechToTextProviderStartOptions]>();
    public readonly stopMock = jest.fn();
    public readonly abortMock = jest.fn();

    private readonly isProviderSupported: boolean;
    private readonly diagnostics: SpeechToTextProviderDiagnostics;

    public constructor(options: FakeSpeechToTextProviderOptions) {
        this.id = options.id;
        this.isProviderSupported = options.isSupported ?? true;
        this.diagnostics = {
            providerId: options.id,
            supportsPartials: options.supportsPartials ?? false,
        };

        if (options.start) {
            this.startMock.mockImplementation(options.start);
        }
    }

    public isSupported(): boolean {
        return this.isProviderSupported;
    }

    public async start(options: SpeechToTextProviderStartOptions): Promise<void> {
        await this.startMock(options);
    }

    public stop(): void {
        this.stopMock();
    }

    public abort(): void {
        this.abortMock();
    }

    public getDiagnostics(): SpeechToTextProviderDiagnostics {
        return this.diagnostics;
    }
}

describe('SpeechToTextFailoverRecognition', () => {
    let consoleInfoSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleInfoSpy.mockRestore();
    });

    it('skips unsupported providers and starts the browser fallback provider', async () => {
        const primaryProvider = new FakeSpeechToTextProvider({
            id: 'openai-whisper-proxy',
            isSupported: false,
        });
        const fallbackProvider = new FakeSpeechToTextProvider({
            id: 'browser-web-speech',
            start: (options) => options.onStart(),
        });
        const events: Array<SpeechRecognitionEvent> = [];
        const telemetryTypes: string[] = [];
        const recognition = new SpeechToTextFailoverRecognition({
            providerFactories: [() => primaryProvider, () => fallbackProvider],
            onTelemetry: (event) => telemetryTypes.push(`${event.type}:${event.providerId}`),
        });

        recognition.subscribe((event) => events.push(event));
        await recognition.$start({ language: 'en-US' });

        expect(fallbackProvider.startMock).toHaveBeenCalledWith(
            expect.objectContaining({
                language: 'en-US',
            }),
        );
        expect(events).toEqual([{ type: 'START' }]);
        expect(telemetryTypes).toEqual([
            'provider-unsupported:openai-whisper-proxy',
            'provider-selected:browser-web-speech',
            'provider-init:browser-web-speech',
        ]);
    });

    it('fails over when the active provider reports a runtime error', async () => {
        const primaryStartOptionsRef: { current: SpeechToTextProviderStartOptions | null } = { current: null };
        const primaryProvider = new FakeSpeechToTextProvider({
            id: 'openai-whisper-proxy',
            start: (options) => {
                primaryStartOptionsRef.current = options;
                options.onStart();
            },
        });
        const fallbackProvider = new FakeSpeechToTextProvider({
            id: 'browser-web-speech',
            start: (options) => options.onStart(),
        });
        const events: Array<SpeechRecognitionEvent> = [];
        const recognition = new SpeechToTextFailoverRecognition({
            providerFactories: [() => primaryProvider, () => fallbackProvider],
        });
        const providerError: SpeechToTextProviderError = {
            code: 'network',
            message: 'Primary provider lost connection.',
            isRetryable: false,
        };

        recognition.subscribe((event) => events.push(event));
        await recognition.$start({ language: 'en-US' });
        expect(primaryStartOptionsRef.current).not.toBeNull();
        primaryStartOptionsRef.current!.onError(providerError);
        await Promise.resolve();
        await Promise.resolve();

        expect(primaryProvider.abortMock).toHaveBeenCalledTimes(1);
        expect(fallbackProvider.startMock).toHaveBeenCalledTimes(1);
        expect(events).toEqual([{ type: 'START' }, { type: 'START' }]);
    });
});
