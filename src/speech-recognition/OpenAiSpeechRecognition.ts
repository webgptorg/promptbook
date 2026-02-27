import { TIME_INTERVALS } from '../constants';
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
     * OpenAI API base URL or proxy endpoint
     * @default '/api/openai/v1'
     */
    readonly baseUrl?: string;
};

/**
 * Speech recognition using OpenAI Whisper API to transcribe audio into text
 *
 * @private because it requires server-client communication with a proxy endpoint
 *
 * Note: This implementation uses a server-side proxy to avoid exposing the OpenAI API key on the client.
 */
export class OpenAiSpeechRecognition implements SpeechRecognition {
    private mediaRecorder: MediaRecorder | null = null;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private silenceTimeout: NodeJS.Timeout | null = null;
    private audioChunks: Blob[] = [];
    private callbacks: Array<(event: SpeechRecognitionEvent) => void> = [];
    private _state: SpeechRecognitionState = 'IDLE';

    public get state(): SpeechRecognitionState {
        return this._state;
    }

    public constructor(private readonly options: OpenAiSpeechRecognitionOptions = {}) {}

    public async $start(options: SpeechRecognitionStartOptions = {}): Promise<void> {
        if (this._state !== 'IDLE') {
            return;
        }

        try {
            this._state = 'STARTING';
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            // Setup silence detection
            this.audioContext = new AudioContext();
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkSilence = () => {
                if (this._state !== 'RECORDING') {
                    return;
                }

                this.analyser!.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i]!;
                }
                const average = sum / bufferLength;

                // Threshold for silence (can be adjusted)
                if (average < 10) {
                    if (!this.silenceTimeout) {
                        this.silenceTimeout = setTimeout(() => {
                            this.$stop();
                        }, TIME_INTERVALS.TWO_SECONDS);
                    }
                } else {
                    if (this.silenceTimeout) {
                        clearTimeout(this.silenceTimeout);
                        this.silenceTimeout = null;
                    }
                }

                requestAnimationFrame(checkSilence);
            };

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });

                // Cleanup audio context
                if (this.audioContext) {
                    this.audioContext.close();
                    this.audioContext = null;
                }
                this.analyser = null;
                if (this.silenceTimeout) {
                    clearTimeout(this.silenceTimeout);
                    this.silenceTimeout = null;
                }

                await this.transcribe(audioBlob, options.language);
            };

            this.mediaRecorder.start();
            this._state = 'RECORDING';
            this.emit({ type: 'START' });

            requestAnimationFrame(checkSilence);
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
            const isoLanguage = resolveSpeechRecognitionLanguageTagForOpenAi(language);
            if (isoLanguage) {
                formData.append('language', isoLanguage);
            }

            const response = await fetch(`${this.options.baseUrl || '/api/openai/v1'}/audio/transcriptions`, {
                method: 'POST',
                // Note: No Authorization header here, the server-side proxy will add it
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

/**
 * Pattern describing an ISO-639-1 code (two alphabetic characters).
 *
 * @private
 */
const ISO_639_1_CODE_PATTERN = /^[a-z]{2}$/i;

/**
 * Normalizes browser-derived language tags to ISO-639-1 codes that OpenAI Whisper accepts.
 *
 * The function drops regional and script subtags, ignores quality values, and validates that the
 * remaining portion matches the two-letter format demanded by the API.
 *
 * @param language Optional language tag reported by the browser or headers.
 * @returns A normalized ISO-639-1 language code or `undefined` when the input cannot be simplified.
 * @private
 */
function resolveSpeechRecognitionLanguageTagForOpenAi(language?: string): string | undefined {
    if (!language) {
        return undefined;
    }

    const [rawCandidate] = language.split(';');
    const normalized = rawCandidate!.trim();
    if (!normalized) {
        return undefined;
    }

    const primary = normalized.split(/[-_]/)[0];
    if (!primary) {
        return undefined;
    }

    if (!ISO_639_1_CODE_PATTERN.test(primary)) {
        return undefined;
    }

    return primary.toLowerCase();
}
