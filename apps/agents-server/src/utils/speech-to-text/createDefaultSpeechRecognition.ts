import type { SpeechRecognition } from '../../../../../src/types/SpeechRecognition';
import { BrowserWebSpeechToTextProvider } from './providers/BrowserWebSpeechToTextProvider';
import { OpenAiSpeechToTextProvider } from './providers/OpenAiSpeechToTextProvider';
import { SpeechToTextFailoverRecognition, type SpeechToTextTelemetryEvent } from './SpeechToTextFailoverRecognition';
import type { SpeechToTextProviderFactory } from './SpeechToTextProvider';

/**
 * Provider keys accepted by default speech-recognition factory.
 */
export type SpeechToTextProviderKey = 'openai' | 'browser';

/**
 * Options for `createDefaultSpeechRecognition`.
 */
export type CreateDefaultSpeechRecognitionOptions = {
    /**
     * Provider priority list from primary to fallback.
     */
    readonly providerPriority?: ReadonlyArray<SpeechToTextProviderKey>;

    /**
     * Optional server endpoint for telemetry forwarding.
     */
    readonly telemetryEndpoint?: string;

    /**
     * Optional telemetry hook.
     */
    readonly onTelemetry?: (event: SpeechToTextTelemetryEvent) => void;
};

/**
 * Default provider priority for Agents Server chat dictation.
 */
const DEFAULT_PROVIDER_PRIORITY: ReadonlyArray<SpeechToTextProviderKey> = ['openai', 'browser'];

/**
 * Provider factory registry.
 */
const PROVIDER_REGISTRY: Readonly<Record<SpeechToTextProviderKey, SpeechToTextProviderFactory>> = {
    openai: () => new OpenAiSpeechToTextProvider(),
    browser: () => new BrowserWebSpeechToTextProvider(),
};

/**
 * Creates one failover-enabled speech recognition instance for Agents Server chat.
 */
export function createDefaultSpeechRecognition(
    options: CreateDefaultSpeechRecognitionOptions = {},
): SpeechRecognition | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }

    const providerPriority = options.providerPriority ?? DEFAULT_PROVIDER_PRIORITY;
    const providerFactories = providerPriority.map((providerKey) => PROVIDER_REGISTRY[providerKey]);

    return new SpeechToTextFailoverRecognition({
        providerFactories,
        telemetryEndpoint: options.telemetryEndpoint,
        onTelemetry: options.onTelemetry,
    });
}
