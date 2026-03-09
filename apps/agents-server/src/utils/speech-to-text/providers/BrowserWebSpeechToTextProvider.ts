import { BrowserSpeechRecognition } from '../../../../../../src/speech-recognition/BrowserSpeechRecognition';
import type { SpeechRecognitionEvent } from '../../../../../../src/types/SpeechRecognition';
import type {
    SpeechToTextProvider,
    SpeechToTextProviderDiagnostics,
    SpeechToTextProviderStartOptions,
} from '../SpeechToTextProvider';
import { normalizeSpeechToTextProviderError } from '../normalizeSpeechToTextProviderError';

/**
 * Web Speech API fallback provider used when higher-priority providers fail.
 */
export class BrowserWebSpeechToTextProvider implements SpeechToTextProvider {
    public readonly id = 'browser-web-speech' as const;

    private recognition: BrowserSpeechRecognition | null = null;
    private unsubscribe: (() => void) | null = null;
    private diagnostics: SpeechToTextProviderDiagnostics = {
        providerId: this.id,
        supportsPartials: true,
        limitations:
            'Browser Web Speech API support differs by browser; Firefox is limited and Safari behavior can vary by version.',
    };

    /**
     * Checks if the browser exposes Web Speech recognition implementation.
     */
    public isSupported(): boolean {
        if (typeof window === 'undefined') {
            return false;
        }

        const webSpeechWindow = window as Window & {
            readonly SpeechRecognition?: unknown;
            readonly webkitSpeechRecognition?: unknown;
        };

        return Boolean(webSpeechWindow.SpeechRecognition || webSpeechWindow.webkitSpeechRecognition);
    }

    /**
     * Starts one Web Speech recognition session and forwards lifecycle events.
     */
    public async start(options: SpeechToTextProviderStartOptions): Promise<void> {
        this.stop();

        if (!this.isSupported()) {
            options.onError(
                normalizeSpeechToTextProviderError({
                    message: 'Browser speech recognition is not supported in this browser.',
                    code: 'unsupported-browser',
                }),
            );
            return;
        }

        this.recognition = new BrowserSpeechRecognition();
        this.unsubscribe = this.recognition.subscribe((event: SpeechRecognitionEvent) => {
            if (event.type === 'START') {
                options.onStart();
                return;
            }

            if (event.type === 'TRANSCRIBING') {
                options.onProcessing();
                return;
            }

            if (event.type === 'RESULT') {
                if (event.isFinal) {
                    options.onFinal(event.text);
                } else {
                    options.onPartial(event.text);
                }
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

        this.recognition.$start({
            language: options.language,
            interimResults: true,
            whisperMode: options.whisperMode,
        });
    }

    /**
     * Stops active recognition and clears listeners.
     */
    public stop(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.recognition?.$stop();
        this.recognition = null;
    }

    /**
     * Aborts active recognition immediately.
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
}
