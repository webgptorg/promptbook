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
 * Default MIME type for recorder output sent to OpenAI transcription.
 */
const DEFAULT_AUDIO_RECORDING_MIME_TYPE = 'audio/webm';

/**
 * Default file extension used when recorder output type cannot be resolved.
 */
const DEFAULT_AUDIO_RECORDING_FILE_EXTENSION = 'webm';

/**
 * Basename used for uploads forwarded to the OpenAI transcription endpoint.
 */
const AUDIO_TRANSCRIPTION_FILE_BASENAME = 'speech-recording';

/**
 * Ordered recorder formats preferred for browser microphone capture.
 */
const PREFERRED_AUDIO_RECORDING_FORMATS = [
    { mimeType: 'audio/webm;codecs=opus', fileExtension: 'webm' },
    { mimeType: 'audio/webm', fileExtension: 'webm' },
    { mimeType: 'audio/mp4', fileExtension: 'mp4' },
    { mimeType: 'audio/ogg;codecs=opus', fileExtension: 'ogg' },
    { mimeType: 'audio/ogg', fileExtension: 'ogg' },
] as const;

/**
 * Default model used for microphone transcription.
 */
const DEFAULT_OPENAI_TRANSCRIPTION_MODEL = 'gpt-4o-transcribe';

/**
 * Keeps transcription output deterministic for short microphone chunks.
 */
const DEFAULT_OPENAI_TRANSCRIPTION_TEMPERATURE = 0;

/**
 * How long silence must last before recording auto-stops.
 */
const SILENCE_AUTO_STOP_DELAY_MS = 1700;

/**
 * Whisper mode keeps recording slightly longer before deciding user has stopped speaking.
 */
const WHISPER_MODE_SILENCE_AUTO_STOP_DELAY_MS = 2800;

/**
 * Guard against stopping too early while the user is just starting to speak.
 */
const MINIMUM_RECORDING_DURATION_BEFORE_AUTO_STOP_MS = 650;

/**
 * Lowest voice level considered as potential speech.
 */
const MINIMUM_VOICE_LEVEL = 0.015;

/**
 * Smoothing factor used while adapting to ambient background noise.
 */
const AMBIENT_NOISE_SMOOTHING_FACTOR = 0.05;

/**
 * Multiplier that turns ambient noise into a speaking threshold.
 */
const VOICE_LEVEL_MULTIPLIER = 1.5;

/**
 * Lower speech threshold used in whisper mode.
 */
const WHISPER_MODE_VOICE_LEVEL_MULTIPLIER = 1.15;

/**
 * Center value for unsigned 8-bit PCM samples returned by Web Audio analyser buffers.
 */
const PCM_U8_MIDPOINT = 128;

/**
 * Speech recognition using the OpenAI transcription API to transcribe audio into text
 *
 * Note: This implementation uses a server-side proxy to avoid exposing the OpenAI API key on the client.
 *
 * @private because it requires server-client communication with a proxy endpoint
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
    private voiceLevelMultiplier = VOICE_LEVEL_MULTIPLIER;
    private silenceAutoStopDelayMs = SILENCE_AUTO_STOP_DELAY_MS;
    private recordingMimeType = DEFAULT_AUDIO_RECORDING_MIME_TYPE;

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
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    autoGainControl: true,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
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
            const preferredRecordingFormat = resolveOpenAiSpeechRecognitionPreferredRecordingFormat();
            this.mediaRecorder = preferredRecordingFormat
                ? new MediaRecorder(stream, { mimeType: preferredRecordingFormat.mimeType })
                : new MediaRecorder(stream);
            this.audioChunks = [];
            this.isStopping = false;
            this.recordingMimeType =
                this.mediaRecorder.mimeType || preferredRecordingFormat?.mimeType || DEFAULT_AUDIO_RECORDING_MIME_TYPE;

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
                void this.handleRecorderStop({
                    language: options.language,
                    transcriptionPrompt: options.transcriptionPrompt,
                });
            };

            this.mediaRecorder.start();
            this._state = 'RECORDING';
            this.recordingStartedAt = Date.now();
            this.lastSpeechDetectedAt = this.recordingStartedAt;
            this.ambientNoiseLevel = MINIMUM_VOICE_LEVEL;
            this.voiceLevelMultiplier = options.whisperMode
                ? WHISPER_MODE_VOICE_LEVEL_MULTIPLIER
                : VOICE_LEVEL_MULTIPLIER;
            this.silenceAutoStopDelayMs = options.whisperMode
                ? WHISPER_MODE_SILENCE_AUTO_STOP_DELAY_MS
                : SILENCE_AUTO_STOP_DELAY_MS;
            this.emit({ type: 'START' });
            this.startSilenceDetection();
        } catch (error) {
            this.releaseRecordingResources();
            this._state = 'ERROR';
            this.emit({
                type: 'ERROR',
                message: (error as Error).message,
                code: resolveSpeechRecognitionErrorCode(error),
            });
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
            this.emit({
                type: 'ERROR',
                message: (error as Error).message,
                code: resolveSpeechRecognitionErrorCode(error),
            });
        }
    }

    private async transcribe(
        audioBlob: Blob,
        options: {
            readonly fileName: string;
            readonly language?: string;
            readonly transcriptionPrompt?: string;
        },
    ): Promise<void> {
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, options.fileName);
            formData.append('model', DEFAULT_OPENAI_TRANSCRIPTION_MODEL);
            formData.append('temperature', String(DEFAULT_OPENAI_TRANSCRIPTION_TEMPERATURE));
            const isoLanguage = resolveSpeechRecognitionLanguageTagForOpenAi(options.language);
            if (isoLanguage) {
                formData.append('language', isoLanguage);
            }

            const transcriptionPrompt = normalizeOpenAiSpeechRecognitionTranscriptionPrompt(options.transcriptionPrompt);
            if (transcriptionPrompt) {
                formData.append('prompt', transcriptionPrompt);
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
            this.emit({
                type: 'ERROR',
                message: (error as Error).message,
                code: resolveSpeechRecognitionErrorCode(error),
            });
        }
    }

    /**
     * Handles `MediaRecorder.onstop` by releasing audio resources and forwarding the clip to transcription.
     *
     * @param language Optional language hint for OpenAI transcription.
     */
    private async handleRecorderStop(options: {
        readonly language?: string;
        readonly transcriptionPrompt?: string;
    }): Promise<void> {
        if (this._state === 'RECORDING') {
            this._state = 'TRANSCRIBING';
            this.emit({ type: 'TRANSCRIBING' });
        }

        const audioFileDescriptor = resolveOpenAiSpeechRecognitionAudioFileDescriptor({
            recorderMimeType: this.recordingMimeType,
            audioChunks: this.audioChunks,
        });
        const audioBlob = new Blob(this.audioChunks, { type: audioFileDescriptor.mimeType });
        this.releaseRecordingResources();

        if (audioBlob.size === 0) {
            this._state = 'IDLE';
            this.emit({ type: 'STOP' });
            return;
        }

        await this.transcribe(audioBlob, {
            fileName: audioFileDescriptor.fileName,
            language: options.language,
            transcriptionPrompt: options.transcriptionPrompt,
        });
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
                silenceDuration >= this.silenceAutoStopDelayMs
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
        return Math.max(MINIMUM_VOICE_LEVEL, this.ambientNoiseLevel * this.voiceLevelMultiplier);
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
        this.voiceLevelMultiplier = VOICE_LEVEL_MULTIPLIER;
        this.silenceAutoStopDelayMs = SILENCE_AUTO_STOP_DELAY_MS;
        this.recordingMimeType = DEFAULT_AUDIO_RECORDING_MIME_TYPE;
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
 * Normalizes browser-derived language tags to ISO-639-1 codes accepted by OpenAI transcription models.
 *
 * The function drops regional and script subtags, ignores quality values, and validates that the
 * remaining portion matches the two-letter format demanded by the API.
 *
 * @param language Optional language tag reported by the browser or headers.
 * @returns A normalized ISO-639-1 language code or `undefined` when the input cannot be simplified.
 *
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

/**
 * Resolves the preferred recorder output format supported by the current browser.
 *
 * @private internal utility of `OpenAiSpeechRecognition`
 */
export function resolveOpenAiSpeechRecognitionPreferredRecordingFormat():
    | {
          readonly mimeType: string;
          readonly fileExtension: string;
      }
    | undefined {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
        return undefined;
    }

    return PREFERRED_AUDIO_RECORDING_FORMATS.find((recordingFormat) => MediaRecorder.isTypeSupported(recordingFormat.mimeType));
}

/**
 * Resolves the MIME type and filename for one recorded audio upload.
 *
 * @private internal utility of `OpenAiSpeechRecognition`
 */
export function resolveOpenAiSpeechRecognitionAudioFileDescriptor(options: {
    readonly recorderMimeType?: string;
    readonly audioChunks: ReadonlyArray<Blob>;
}): {
    readonly mimeType: string;
    readonly fileName: string;
} {
    const mimeType =
        normalizeOpenAiSpeechRecognitionAudioMimeType(options.recorderMimeType) ||
        options.audioChunks.map((audioChunk) => normalizeOpenAiSpeechRecognitionAudioMimeType(audioChunk.type)).find(Boolean) ||
        DEFAULT_AUDIO_RECORDING_MIME_TYPE;

    const fileExtension = resolveOpenAiSpeechRecognitionAudioFileExtension(mimeType);

    return {
        mimeType,
        fileName: `${AUDIO_TRANSCRIPTION_FILE_BASENAME}.${fileExtension}`,
    };
}

/**
 * Normalizes optional transcription prompt text before sending it to OpenAI.
 */
function normalizeOpenAiSpeechRecognitionTranscriptionPrompt(transcriptionPrompt?: string): string | undefined {
    const normalizedTranscriptionPrompt = transcriptionPrompt?.trim();
    if (!normalizedTranscriptionPrompt) {
        return undefined;
    }

    return normalizedTranscriptionPrompt;
}

/**
 * Maps MIME types to upload file extensions supported by OpenAI audio transcription.
 */
function resolveOpenAiSpeechRecognitionAudioFileExtension(mimeType: string): string {
    const normalizedMimeType = normalizeOpenAiSpeechRecognitionAudioMimeType(mimeType);
    if (!normalizedMimeType) {
        return DEFAULT_AUDIO_RECORDING_FILE_EXTENSION;
    }

    if (normalizedMimeType.includes('ogg')) {
        return 'ogg';
    }

    if (normalizedMimeType.includes('mp4')) {
        return 'mp4';
    }

    if (normalizedMimeType.includes('wav')) {
        return 'wav';
    }

    if (normalizedMimeType.includes('mpeg') || normalizedMimeType.includes('mp3')) {
        return 'mp3';
    }

    return DEFAULT_AUDIO_RECORDING_FILE_EXTENSION;
}

/**
 * Normalizes browser MIME types while dropping codec suffixes that do not affect file extension.
 */
function normalizeOpenAiSpeechRecognitionAudioMimeType(mimeType?: string): string | undefined {
    const [rawMimeType] = `${mimeType || ''}`.split(';');
    const normalizedMimeType = rawMimeType?.trim().toLowerCase();
    if (!normalizedMimeType) {
        return undefined;
    }

    return normalizedMimeType;
}

/**
 * Maps unknown recorder or browser errors into speech-recognition error codes.
 *
 * @param error Unknown browser/runtime error.
 * @returns Stable speech-recognition code.
 *
 * @private internal helper of `OpenAiSpeechRecognition`
 */
function resolveSpeechRecognitionErrorCode(error: unknown): 'permission-denied' | 'audio-capture' | 'unknown' {
    const errorName = `${(error as Error | undefined)?.name || ''}`.toLowerCase();
    const errorMessage = `${(error as Error | undefined)?.message || ''}`.toLowerCase();
    const haystack = `${errorName} ${errorMessage}`;

    if (haystack.includes('notallowederror') || haystack.includes('permission')) {
        return 'permission-denied';
    }

    if (haystack.includes('notfounderror') || haystack.includes('audio-capture') || haystack.includes('microphone')) {
        return 'audio-capture';
    }

    return 'unknown';
}
