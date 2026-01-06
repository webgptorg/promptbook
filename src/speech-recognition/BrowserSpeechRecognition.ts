import type {
    SpeechRecognition,
    SpeechRecognitionEvent,
    SpeechRecognitionStartOptions,
    SpeechRecognitionState,
} from '../types/SpeechRecognition';

/**
 * Speech recognition using Web Speech API `SpeechRecognition` available in modern browsers
 */
export class BrowserSpeechRecognition implements SpeechRecognition {
    private recognition: any = null;
    private callbacks: Array<(event: SpeechRecognitionEvent) => void> = [];
    private _state: SpeechRecognitionState = 'IDLE';

    public get state(): SpeechRecognitionState {
        return this._state;
    }

    public constructor() {
        if (typeof window !== 'undefined') {
            const SpeechRecognitionValue = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognitionValue) {
                this.recognition = new SpeechRecognitionValue();
                this.recognition.continuous = true;
                this.recognition.interimResults = true;

                this.recognition.onstart = () => {
                    this._state = 'RECORDING';
                    this.emit({ type: 'START' });
                };

                this.recognition.onresult = (event: any) => {
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

                this.recognition.onerror = (event: any) => {
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
        this.recognition.lang = options.language || 'en-US';
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
