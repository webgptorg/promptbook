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
 * Default API base path used by the server-side OpenAI proxy.
 */
const DEFAULT_OPENAI_BASE_URL = '/api/openai/v1';

/**
 * Mime type for recorder output sent to Whisper.
 */
const AUDIO_WAVE_MIME_TYPE = 'audio/wav';

/**
 * How long silence must last before recording auto-stops.
 */
const SILENCE_AUTO_STOP_DELAY_MS = 1200;

/**
 * Guard against stopping too early while the user is just starting to speak.
 */
const MINIMUM_RECORDING_DURATION_BEFORE_AUTO_STOP_MS = 350;

/**
 * Lowest voice level considered as potential speech.
 */
const MINIMUM_VOICE_LEVEL = 0.02;

/**
 * Smoothing factor used while adapting to ambient background noise.
 */
const AMBIENT_NOISE_SMOOTHING_FACTOR = 0.05;

/**
 * Multiplier that turns ambient noise into a speaking threshold.
 */
const VOICE_LEVEL_MULTIPLIER = 1.8;

/**
 * Center value for unsigned 8-bit PCM samples returned by Web Audio analyser buffers.
 */
const PCM_U8_MIDPOINT = 128;

/**
 * Speech recognition using OpenAI Whisper API to transcribe audio into text
 *
 * @private because it requires server-client communication with a proxy endpoint
 *
 * Note: This implementation uses a server-side proxy to avoid exposing the OpenAI API key on the client.
 */
export class OpenAiSpeechRecognition implements SpeechRecognition {
    private mediaRecorder: MediaRecorder | null = null;
    private mediaStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
    private analyser: AnalyserNode | null = null;
    private silenceCheckAnimationFrameId: number | null = null;
    private audioChunks: Blob[] = [];
    private callbacks: Array<(event: SpeechRecognitionEvent) => void> = [];
    private _state: SpeechRecognitionState = 'IDLE';
    private pendingStopDuringStart = false;
    private isStopping = false;
    private recordingStartedAt = 0;
    private lastSpeechDetectedAt = 0;
    private ambientNoiseLevel = MINIMUM_VOICE_LEVEL;

    public get state(): SpeechRecognitionState {
        return this._state;
    }

    public constructor(private readonly options: OpenAiSpeechRecognitionOptions = {}) {}

    public async $start(options: SpeechRecognitionStartOptions = {}): Promise<void> {
        if (this._state !== 'IDLE' && this._state !== 'ERROR') {
            return;
        }

        try {
            this.releaseRecordingResources();
            this._state = 'STARTING';
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (this.pendingStopDuringStart) {
                stream.getTracks().forEach((track) => {
                    track.stop();
                });
                this.pendingStopDuringStart = false;
                this._state = 'IDLE';
                this.emit({ type: 'STOP' });
                return;
            }

            this.mediaStream = stream;
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.isStopping = false;

            this.audioContext = new AudioContext();
            this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.mediaStreamSource.connect(this.analyser);

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                void this.handleRecorderStop(options.language);
            };

            this.mediaRecorder.start();
            this._state = 'RECORDING';
            this.recordingStartedAt = Date.now();
            this.lastSpeechDetectedAt = this.recordingStartedAt;
            this.ambientNoiseLevel = MINIMUM_VOICE_LEVEL;
            this.emit({ type: 'START' });
            this.startSilenceDetection();
        } catch (error) {
            this.releaseRecordingResources();
            this._state = 'ERROR';
            this.emit({ type: 'ERROR', message: (error as Error).message });
        }
    }

    public $stop(): void {
        if (this._state === 'STARTING') {
            this.pendingStopDuringStart = true;
            return;
        }

        if (!this.mediaRecorder || this._state !== 'RECORDING' || this.isStopping) {
            return;
        }

        this.isStopping = true;
        this._state = 'TRANSCRIBING';
        this.emit({ type: 'TRANSCRIBING' });
        this.stopSilenceDetection();

        try {
            if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            } else {
                this.releaseRecordingResources();
                this._state = 'IDLE';
                this.emit({ type: 'STOP' });
            }
        } catch (error) {
            this.releaseRecordingResources();
            this._state = 'ERROR';
            this.emit({ type: 'ERROR', message: (error as Error).message });
        }
    }

    private async transcribe(audioBlob: Blob, language?: string): Promise<void> {
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.wav');
            formData.append('model', 'whisper-1');
            const isoLanguage = resolveSpeechRecognitionLanguageTagForOpenAi(language);
            if (isoLanguage) {
                formData.append('language', isoLanguage);
            }

            const response = await fetch(`${this.options.baseUrl || DEFAULT_OPENAI_BASE_URL}/audio/transcriptions`, {
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

            if (typeof text === 'string' && text.trim() !== '') {
                this.emit({
                    type: 'RESULT',
                    text,
                    isFinal: true,
                });
            }

            this._state = 'IDLE';
            this.emit({ type: 'STOP' });
        } catch (error) {
            this._state = 'ERROR';
            this.emit({ type: 'ERROR', message: (error as Error).message });
        }
    }

    /**
     * Handles `MediaRecorder.onstop` by releasing audio resources and forwarding the clip to transcription.
     *
     * @param language Optional language hint for Whisper.
     */
    private async handleRecorderStop(language?: string): Promise<void> {
        if (this._state === 'RECORDING') {
            this._state = 'TRANSCRIBING';
            this.emit({ type: 'TRANSCRIBING' });
        }

        const audioBlob = new Blob(this.audioChunks, { type: AUDIO_WAVE_MIME_TYPE });
        this.releaseRecordingResources();

        if (audioBlob.size === 0) {
            this._state = 'IDLE';
            this.emit({ type: 'STOP' });
            return;
        }

        await this.transcribe(audioBlob, language);
    }

    /**
     * Starts continuous silence detection and auto-stops recording shortly after speech ends.
     */
    private startSilenceDetection(): void {
        if (!this.analyser) {
            return;
        }

        const sampleBuffer = new Uint8Array(this.analyser.fftSize);

        const checkSilence = () => {
            if (this._state !== 'RECORDING' || !this.analyser) {
                return;
            }

            const now = Date.now();
            const voiceLevel = this.measureVoiceLevel(sampleBuffer);
            const adaptiveThreshold = this.resolveAdaptiveVoiceThreshold();
            const isSpeechDetected = voiceLevel >= adaptiveThreshold;

            if (isSpeechDetected) {
                this.lastSpeechDetectedAt = now;
            } else {
                this.updateAmbientNoiseLevel(voiceLevel);
            }

            const recordingDuration = now - this.recordingStartedAt;
            const silenceDuration = now - this.lastSpeechDetectedAt;
            if (
                recordingDuration >= MINIMUM_RECORDING_DURATION_BEFORE_AUTO_STOP_MS &&
                silenceDuration >= SILENCE_AUTO_STOP_DELAY_MS
            ) {
                this.$stop();
                return;
            }

            this.silenceCheckAnimationFrameId = requestAnimationFrame(checkSilence);
        };

        this.silenceCheckAnimationFrameId = requestAnimationFrame(checkSilence);
    }

    /**
     * Stops the silence-detection animation loop.
     */
    private stopSilenceDetection(): void {
        if (this.silenceCheckAnimationFrameId === null) {
            return;
        }

        cancelAnimationFrame(this.silenceCheckAnimationFrameId);
        this.silenceCheckAnimationFrameId = null;
    }

    /**
     * Measures current voice intensity from the waveform (`0` silent .. `1` loud).
     *
     * @param sampleBuffer Buffer reused across animation frames.
     * @returns RMS-based volume level.
     */
    private measureVoiceLevel(sampleBuffer: Uint8Array): number {
        if (!this.analyser) {
            return 0;
        }

        this.analyser.getByteTimeDomainData(sampleBuffer);

        let sumOfSquares = 0;
        for (const value of sampleBuffer) {
            const normalizedSample = (value - PCM_U8_MIDPOINT) / PCM_U8_MIDPOINT;
            sumOfSquares += normalizedSample * normalizedSample;
        }

        return Math.sqrt(sumOfSquares / sampleBuffer.length);
    }

    /**
     * Returns an adaptive speech threshold based on recently observed ambient noise.
     */
    private resolveAdaptiveVoiceThreshold(): number {
        return Math.max(MINIMUM_VOICE_LEVEL, this.ambientNoiseLevel * VOICE_LEVEL_MULTIPLIER);
    }

    /**
     * Updates the rolling ambient noise estimate during silent frames.
     *
     * @param voiceLevel Observed frame loudness.
     */
    private updateAmbientNoiseLevel(voiceLevel: number): void {
        this.ambientNoiseLevel =
            this.ambientNoiseLevel * (1 - AMBIENT_NOISE_SMOOTHING_FACTOR) + voiceLevel * AMBIENT_NOISE_SMOOTHING_FACTOR;
    }

    /**
     * Releases browser audio resources so the microphone is fully freed for other apps.
     */
    private releaseRecordingResources(): void {
        this.stopSilenceDetection();

        if (this.mediaStreamSource) {
            this.mediaStreamSource.disconnect();
            this.mediaStreamSource = null;
        }

        if (this.audioContext) {
            void this.audioContext.close().catch(() => undefined);
            this.audioContext = null;
        }

        this.analyser = null;
        this.stopMediaStreamTracks();
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isStopping = false;
        this.recordingStartedAt = 0;
        this.lastSpeechDetectedAt = 0;
        this.ambientNoiseLevel = MINIMUM_VOICE_LEVEL;
        this.pendingStopDuringStart = false;
    }

    /**
     * Stops all microphone tracks if an active media stream exists.
     */
    private stopMediaStreamTracks(): void {
        if (!this.mediaStream) {
            return;
        }

        this.mediaStream.getTracks().forEach((track) => {
            track.stop();
        });
        this.mediaStream = null;
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
