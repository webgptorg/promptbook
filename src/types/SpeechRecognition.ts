import type { string_language } from './typeAliases';

/**
 * Stable speech-recognition error codes consumed by UI and telemetry.
 */
export type SpeechRecognitionErrorCode =
    | 'permission-denied'
    | 'audio-capture'
    | 'network'
    | 'no-speech'
    | 'aborted'
    | 'unsupported-browser'
    | 'unknown';

/**
 * Interface for speech-to-text recognition
 *
 * @🚉 fully serializable as JSON
 */
export type SpeechRecognition = {
    /**
     * Start the speech recognition
     */
    $start(options: SpeechRecognitionStartOptions): void;

    /**
     * Stop the speech recognition
     */
    $stop(): void;

    /**
     * Current state of the speech recognition
     */
    readonly state: SpeechRecognitionState;

    /**
     * Subscribe to speech recognition events
     */
    subscribe(callback: (event: SpeechRecognitionEvent) => void): () => void;
};

/**
 * Options for starting speech recognition
 */
export type SpeechRecognitionStartOptions = {
    /**
     * Language for speech recognition
     * @default 'en-US'
     */
    readonly language?: string_language;

    /**
     * Whether to return interim results
     * @default true
     */
    readonly interimResults?: boolean;

    /**
     * Enables a more sensitive profile for quiet speech.
     */
    readonly whisperMode?: boolean;
};

/**
 * Current state of the speech recognition
 */
export type SpeechRecognitionState = 'IDLE' | 'STARTING' | 'RECORDING' | 'TRANSCRIBING' | 'ERROR';

/**
 * Event emitted by speech recognition
 */
export type SpeechRecognitionEvent =
    | {
          readonly type: 'START';
      }
    | {
          readonly type: 'TRANSCRIBING';
      }
    | {
          readonly type: 'RESULT';
          readonly text: string;
          readonly isFinal: boolean;
      }
    | {
          readonly type: 'ERROR';
          readonly message: string;
          readonly code?: SpeechRecognitionErrorCode;
          readonly providerId?: string;
          readonly canRetry?: boolean;
          readonly canOpenBrowserSettings?: boolean;
      }
    | {
          readonly type: 'STOP';
      };
