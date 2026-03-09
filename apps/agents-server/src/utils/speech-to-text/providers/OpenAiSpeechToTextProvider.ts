import { BrowserSpeechRecognition } from '../../../../../../src/speech-recognition/BrowserSpeechRecognition';
import { OpenAiSpeechRecognition } from '../../../../../../src/speech-recognition/OpenAiSpeechRecognition';
import type { SpeechRecognitionEvent } from '../../../../../../src/types/SpeechRecognition';
import type {
    SpeechToTextProvider,
    SpeechToTextProviderDiagnostics,
    SpeechToTextProviderStartOptions,
} from '../SpeechToTextProvider';
import { normalizeSpeechToTextProviderError } from '../normalizeSpeechToTextProviderError';

/**
 * OpenAI Whisper provider that uses server-side proxy transcription.
 */
export class OpenAiSpeechToTextProvider implements SpeechToTextProvider {
    public readonly id = 'openai-whisper-proxy' as const;

    private coreRecognition: OpenAiSpeechRecognition | null = null;
    private coreUnsubscribe: (() => void) | null = null;

    private companionRecognition: BrowserSpeechRecognition | null = null;
    private companionUnsubscribe: (() => void) | null = null;

    private lastCompanionPartial = '';

    private diagnostics: SpeechToTextProviderDiagnostics = {
        providerId: this.id,
        supportsPartials: false,
        limitations:
            'OpenAI Whisper proxy emits final chunks. Interim text may be estimated using browser speech recognition when available.',
    };

    /**
     * Checks browser capabilities required for recorder-based Whisper proxy transcription.
     */
    public isSupported(): boolean {
        if (typeof window === 'undefined') {
            return false;
        }

        const hasMediaDevices = Boolean(window.navigator?.mediaDevices?.getUserMedia);
        const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
        return hasMediaDevices && hasMediaRecorder;
    }

    /**
     * Starts the primary OpenAI provider and optional browser companion partial stream.
     */
    public async start(options: SpeechToTextProviderStartOptions): Promise<void> {
        this.stop();

        if (!this.isSupported()) {
            options.onError(
                normalizeSpeechToTextProviderError({
                    message: 'Audio recording is not supported in this browser.',
                    code: 'unsupported-browser',
                }),
            );
            return;
        }

        this.coreRecognition = new OpenAiSpeechRecognition();
        this.coreUnsubscribe = this.coreRecognition.subscribe((event: SpeechRecognitionEvent) => {
            if (event.type === 'START') {
                options.onStart();
                return;
            }

            if (event.type === 'TRANSCRIBING') {
                options.onProcessing();
                return;
            }

            if (event.type === 'RESULT') {
                options.onFinal(event.text);
                return;
            }

            if (event.type === 'ERROR') {
                options.onError(
                    normalizeSpeechToTextProviderError({
                        message: event.message,
                        code: event.code,
                    }),
                );
                return;
            }

            if (event.type === 'STOP') {
                options.onStop();
            }
        });

        this.tryStartCompanionPartialRecognition(options);

        await this.coreRecognition.$start({
            language: options.language,
            interimResults: true,
            whisperMode: options.whisperMode,
        });
    }

    /**
     * Stops all active recognizers and unsubscribes event handlers.
     */
    public stop(): void {
        this.stopCompanionPartialRecognition();

        this.coreUnsubscribe?.();
        this.coreUnsubscribe = null;
        this.coreRecognition?.$stop();
        this.coreRecognition = null;
    }

    /**
     * Aborts active provider work immediately.
     */
    public abort(): void {
        this.stop();
    }

    /**
     * Returns provider diagnostics for telemetry and optional UI hints.
     */
    public getDiagnostics(): SpeechToTextProviderDiagnostics {
        return this.diagnostics;
    }

    /**
     * Starts optional browser-side partial transcript companion for live UX.
     */
    private tryStartCompanionPartialRecognition(options: SpeechToTextProviderStartOptions): void {
        const webSpeechWindow =
            typeof window === 'undefined'
                ? undefined
                : (window as Window & { readonly SpeechRecognition?: unknown; readonly webkitSpeechRecognition?: unknown });

        const isCompanionSupported = Boolean(webSpeechWindow?.SpeechRecognition || webSpeechWindow?.webkitSpeechRecognition);
        this.diagnostics = {
            ...this.diagnostics,
            supportsPartials: isCompanionSupported,
        };

        if (!isCompanionSupported) {
            return;
        }

        this.lastCompanionPartial = '';
        this.companionRecognition = new BrowserSpeechRecognition();
        this.companionUnsubscribe = this.companionRecognition.subscribe((event: SpeechRecognitionEvent) => {
            if (event.type !== 'RESULT') {
                return;
            }

            const normalizedText = event.text.trim();
            if (!normalizedText || normalizedText === this.lastCompanionPartial) {
                return;
            }

            this.lastCompanionPartial = normalizedText;
            options.onPartial(normalizedText);
        });

        this.companionRecognition.$start({
            language: options.language,
            interimResults: true,
            whisperMode: options.whisperMode,
        });
    }

    /**
     * Stops optional browser-side partial transcript companion.
     */
    private stopCompanionPartialRecognition(): void {
        this.companionUnsubscribe?.();
        this.companionUnsubscribe = null;
        this.companionRecognition?.$stop();
        this.companionRecognition = null;
        this.lastCompanionPartial = '';
    }
}
