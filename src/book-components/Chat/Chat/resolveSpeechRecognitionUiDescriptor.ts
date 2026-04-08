/**
 * Runtime voice UI states shown on the primary microphone control.
 *
 * @private function of `useChatInputAreaDictation`
 */
export type DictationUiState = 'idle' | 'listening' | 'processing' | 'error' | 'disabled';

/**
 * Visual tone used by the floating speech-status bubble.
 *
 * @private function of `useChatInputAreaDictation`
 */
export type SpeechStatusBubbleTone = 'neutral' | 'recording' | 'processing' | 'error';

/**
 * UI metadata derived from the current speech-recognition state.
 *
 * @private function of `useChatInputAreaDictation`
 */
export type SpeechRecognitionUiDescriptor = {
    readonly buttonTitle: string;
    readonly bubbleText?: string;
    readonly bubbleTone?: SpeechStatusBubbleTone;
    readonly isButtonActive: boolean;
    readonly isButtonDisabled: boolean;
};

/**
 * Shared mapping from recognizer state to the chat voice-control UI.
 *
 * @private function of `resolveSpeechRecognitionUiDescriptor`
 */
const SPEECH_RECOGNITION_UI_DESCRIPTORS: Record<DictationUiState, SpeechRecognitionUiDescriptor> = {
    idle: {
        buttonTitle: 'Start dictation',
        isButtonActive: false,
        isButtonDisabled: false,
    },
    listening: {
        buttonTitle: 'Stop dictation',
        bubbleText: 'Listening...',
        bubbleTone: 'recording',
        isButtonActive: true,
        isButtonDisabled: false,
    },
    processing: {
        buttonTitle: 'Processing dictated speech...',
        bubbleText: 'Processing speech...',
        bubbleTone: 'processing',
        isButtonActive: true,
        isButtonDisabled: false,
    },
    error: {
        buttonTitle: 'Dictation failed. Tap to retry.',
        bubbleText: 'Dictation failed. Tap microphone to retry.',
        bubbleTone: 'error',
        isButtonActive: false,
        isButtonDisabled: false,
    },
    disabled: {
        buttonTitle: 'Microphone permission blocked. Tap to re-request.',
        bubbleText: 'Microphone permission is blocked.',
        bubbleTone: 'error',
        isButtonActive: false,
        isButtonDisabled: false,
    },
};

/**
 * Resolves voice-button and floating-bubble UI from a speech-recognition state.
 *
 * @private function of `useChatInputAreaDictation`
 */
export function resolveSpeechRecognitionUiDescriptor(state: DictationUiState): SpeechRecognitionUiDescriptor {
    return SPEECH_RECOGNITION_UI_DESCRIPTORS[state];
}
