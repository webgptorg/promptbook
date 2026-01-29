import type { string_language } from './typeAliases';

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
          readonly type: 'RESULT';
          readonly text: string;
          readonly isFinal: boolean;
      }
    | {
          readonly type: 'ERROR';
          readonly message: string;
      }
    | {
          readonly type: 'STOP';
      };
