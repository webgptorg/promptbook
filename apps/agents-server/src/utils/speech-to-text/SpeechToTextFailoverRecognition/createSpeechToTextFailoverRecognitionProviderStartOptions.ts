import type { SpeechToTextProviderError, SpeechToTextProviderStartOptions } from '../SpeechToTextProvider';

type CreateSpeechToTextFailoverRecognitionProviderStartOptionsOptions = {
    readonly language?: string;
    readonly whisperMode?: boolean;
    readonly isCurrentProviderSession: () => boolean;
    readonly onStart: () => void;
    readonly onProcessing: () => void;
    readonly onPartial: (text: string) => void;
    readonly onFinal: (text: string) => void;
    readonly onError: (error: SpeechToTextProviderError) => Promise<void> | void;
    readonly onStop: () => void;
};

/**
 * Builds provider callback wiring for `SpeechToTextFailoverRecognition`.
 *
 * @private function of SpeechToTextFailoverRecognition
 */
export function createSpeechToTextFailoverRecognitionProviderStartOptions(
    options: CreateSpeechToTextFailoverRecognitionProviderStartOptionsOptions,
): SpeechToTextProviderStartOptions {
    return {
        language: options.language,
        whisperMode: options.whisperMode,
        onStart: () => {
            if (!options.isCurrentProviderSession()) {
                return;
            }

            options.onStart();
        },
        onProcessing: () => {
            if (!options.isCurrentProviderSession()) {
                return;
            }

            options.onProcessing();
        },
        onPartial: (text) => {
            if (!options.isCurrentProviderSession()) {
                return;
            }

            options.onPartial(text);
        },
        onFinal: (text) => {
            if (!options.isCurrentProviderSession()) {
                return;
            }

            options.onFinal(text);
        },
        onError: (error) => {
            if (!options.isCurrentProviderSession()) {
                return;
            }

            void options.onError(error);
        },
        onStop: () => {
            if (!options.isCurrentProviderSession()) {
                return;
            }

            options.onStop();
        },
    };
}
