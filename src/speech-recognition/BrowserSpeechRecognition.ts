import { TODO_any } from '../_packages/types.index';
import type {
    SpeechRecognition,
    SpeechRecognitionEvent,
    SpeechRecognitionStartOptions,
    SpeechRecognitionState,
} from '../types/SpeechRecognition';

/**
 * Speech recognition using Web Speech API `SpeechRecognition` available in modern browsers
 *
 * @public exported from `@promptbook/browser`
 */
export class BrowserSpeechRecognition implements SpeechRecognition {
    private recognition: TODO_any = null;
    private callbacks: Array<(event: SpeechRecognitionEvent) => void> = [];
    private _state: SpeechRecognitionState = 'IDLE';

    public get state(): SpeechRecognitionState {
        return this._state;
    }

    public constructor() {
        if (typeof window !== 'undefined') {
            const SpeechRecognitionValue =
                (window as TODO_any).SpeechRecognition ||
                (window as TODO_any) /* <- TODO: !!!! Make special windowAny */.webkitSpeechRecognition;
            if (SpeechRecognitionValue) {
                this.recognition = new SpeechRecognitionValue();
                this.recognition.continuous = true;
                this.recognition.interimResults = true;

                this.recognition.onstart = () => {
                    this._state = 'RECORDING';
                    this.emit({ type: 'START' });
                };

                this.recognition.onresult = (event: TODO_any) => {
                    let finalTranscript = '';
                    let interimTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }

                    const text = (finalTranscript + interimTranscript).trim();
                    if (text) {
                        this.emit({
                            type: 'RESULT',
                            text,
                            isFinal: interimTranscript === '',
                        });
                    }
                };

                this.recognition.onerror = (event: TODO_any) => {
                    this._state = 'ERROR';
                    this.emit({ type: 'ERROR', message: event.error || 'Unknown error' });
                };

                this.recognition.onend = () => {
                    this._state = 'IDLE';
                    this.emit({ type: 'STOP' });
                };
            }
        }
    }

    public $start(options: SpeechRecognitionStartOptions = {}): void {
        if (!this.recognition) {
            this.emit({ type: 'ERROR', message: 'Speech recognition is not supported in this browser.' });
            return;
        }

        if (this._state !== 'IDLE') {
            return;
        }

        this._state = 'STARTING';
        this.recognition.lang = options.language || 'en'; // Note: Web Speech API usually accepts ISO-639-1 or BCP-47
        this.recognition.interimResults = options.interimResults ?? true;

        try {
            this.recognition.start();
        } catch (error) {
            this._state = 'ERROR';
            this.emit({ type: 'ERROR', message: (error as Error).message });
        }
    }

    public $stop(): void {
        if (!this.recognition || this._state === 'IDLE') {
            return;
        }

        this.recognition.stop();
    }

    public subscribe(callback: (event: SpeechRecognitionEvent) => void): () => void {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter((cb) => cb !== callback);
        };
    }

    private emit(event: SpeechRecognitionEvent): void {
        for (const callback of this.callbacks) {
            callback(event);
        }
    }
}

/**
 * TODO: !!!! Search ACRY for `window` and put -> [🔵]
 * Note: [🔵] Code in this file should never be published outside of `@promptbook/browser`
 */
