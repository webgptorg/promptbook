import type {
    SpeechRecognition,
    SpeechRecognitionEvent,
    SpeechRecognitionStartOptions,
    SpeechRecognitionState,
} from '../types/SpeechRecognition';

/**
 * Options for OpenAiSpeechRecognition
 */
export type OpenAiSpeechRecognitionOptions = {
    /**
     * OpenAI API key
     */
    readonly apiKey: string;

    /**
     * OpenAI API base URL
     * @default 'https://api.openai.com/v1'
     */
    readonly baseUrl?: string;
};

/**
 * Speech recognition using OpenAI Whisper API to transcribe audio into text
 * 
 * @public exported from `@promptbook/openai`
 */
export class OpenAiSpeechRecognition implements SpeechRecognition {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private callbacks: Array<(event: SpeechRecognitionEvent) => void> = [];
    private _state: SpeechRecognitionState = 'IDLE';

    public get state(): SpeechRecognitionState {
        return this._state;
    }

    public constructor(private readonly options: OpenAiSpeechRecognitionOptions) {}

    public async $start(options: SpeechRecognitionStartOptions = {}): Promise<void> {
        if (this._state !== 'IDLE') {
            return;
        }

        try {
            this._state = 'STARTING';
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                await this.transcribe(audioBlob, options.language);
            };

            this.mediaRecorder.start();
            this._state = 'RECORDING';
            this.emit({ type: 'START' });
        } catch (error) {
            this._state = 'ERROR';
            this.emit({ type: 'ERROR', message: (error as Error).message });
        }
    }

    public $stop(): void {
        if (!this.mediaRecorder || this._state !== 'RECORDING') {
            return;
        }

        this.mediaRecorder.stop();
        // MediaRecorder stop will trigger onstop handler which does the transcription
    }

    private async transcribe(audioBlob: Blob, language?: string): Promise<void> {
        this._state = 'TRANSCRIBING';
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.wav');
            formData.append('model', 'whisper-1');
            if (language) {
                formData.append('language', language);
            }

            const response = await fetch(`${this.options.baseUrl || 'https://api.openai.com/v1'}/audio/transcriptions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.options.apiKey}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Transcription failed');
            }

            const data = await response.json();
            const text = data.text;

            this.emit({
                type: 'RESULT',
                text,
                isFinal: true,
            });

            this._state = 'IDLE';
            this.emit({ type: 'STOP' });
        } catch (error) {
            this._state = 'ERROR';
            this.emit({ type: 'ERROR', message: (error as Error).message });
        }
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


