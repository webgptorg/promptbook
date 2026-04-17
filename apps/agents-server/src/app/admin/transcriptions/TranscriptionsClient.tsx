'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SpeechRecognitionEvent } from '../../../../../../src/types/SpeechRecognition';
import { resolveSpeechRecognitionLanguage } from '../../../../../../src/utils/language/getBrowserPreferredSpeechRecognitionLanguage';
import { Card } from '../../../components/Homepage/Card';
import { createDefaultSpeechRecognition, type SpeechToTextProviderKey } from '../../../utils/speech-to-text/createDefaultSpeechRecognition';
import {
    LongRunningSpeechRecognitionSession,
    type LongRunningSpeechRecognitionSessionEvent,
} from '../../../utils/speech-to-text/LongRunningSpeechRecognitionSession';
import type { SpeechToTextProviderDiagnostics, SpeechToTextProviderId } from '../../../utils/speech-to-text/SpeechToTextProvider';

/**
 * Maximum number of recent telemetry entries shown in diagnostics.
 */
const MAX_RECENT_TELEMETRY_EVENTS = 20;

/**
 * Common language presets offered by the testing page.
 */
const LANGUAGE_OPTIONS = [
    { value: 'auto', label: 'Auto (browser default)' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'cs-CZ', label: 'Czech' },
    { value: 'de-DE', label: 'German' },
    { value: 'es-ES', label: 'Spanish' },
    { value: 'fr-FR', label: 'French' },
    { value: 'it-IT', label: 'Italian' },
    { value: 'ja-JP', label: 'Japanese' },
    { value: 'pt-BR', label: 'Portuguese (Brazil)' },
    { value: 'uk-UA', label: 'Ukrainian' },
] as const;

/**
 * Provider toggle values supported by the testing page.
 */
type ProviderMode = 'default' | 'openai-only' | 'browser-only';

/**
 * Local representation of one telemetry row rendered in diagnostics.
 */
type DiagnosticsTelemetryEntry = {
    readonly recordedAt: string;
    readonly event: LongRunningSpeechRecognitionSessionEvent;
};

/**
 * Preview-friendly description of the latest notable transcription event.
 */
type LatestEventState = {
    readonly label: string;
    readonly detail?: string;
};

/**
 * Human labels for provider identifiers.
 */
const PROVIDER_LABELS: Record<SpeechToTextProviderId, string> = {
    'browser-web-speech': 'Browser Web Speech API',
    'openai-whisper-proxy': 'OpenAI Whisper Proxy',
};

/**
 * Admin playground for long-running transcription sessions.
 */
export function TranscriptionsClient() {
    const sessionRef = useRef<LongRunningSpeechRecognitionSession | null>(null);

    const [providerMode, setProviderMode] = useState<ProviderMode>('default');
    const [selectedLanguage, setSelectedLanguage] = useState<(typeof LANGUAGE_OPTIONS)[number]['value']>('auto');
    const [isWhisperModeEnabled, setIsWhisperModeEnabled] = useState(false);

    const [isRunning, setIsRunning] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [sessionStartedAtMs, setSessionStartedAtMs] = useState<number | null>(null);

    const [finalChunks, setFinalChunks] = useState<Array<string>>([]);
    const [partialText, setPartialText] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
    const [restartCount, setRestartCount] = useState(0);
    const [currentProviderId, setCurrentProviderId] = useState<SpeechToTextProviderId | undefined>(undefined);
    const [currentProviderDiagnostics, setCurrentProviderDiagnostics] = useState<SpeechToTextProviderDiagnostics | undefined>(
        undefined,
    );
    const [latestEvent, setLatestEvent] = useState<LatestEventState>({
        label: 'Idle',
    });
    const [recentTelemetryEntries, setRecentTelemetryEntries] = useState<Array<DiagnosticsTelemetryEntry>>([]);

    /**
     * Stops and disposes any active session instance.
     */
    const stopActiveSession = () => {
        sessionRef.current?.$stop();
        sessionRef.current = null;
    };

    /**
     * Applies one wrapper-level lifecycle or telemetry event to the page state.
     */
    const handleSessionEvent = (event: LongRunningSpeechRecognitionSessionEvent) => {
        setRecentTelemetryEntries((previousEntries) => {
            const nextEntries = [
                ...previousEntries,
                {
                    recordedAt: new Date().toISOString(),
                    event,
                },
            ];
            return nextEntries.slice(-MAX_RECENT_TELEMETRY_EVENTS);
        });

        if (event.type === 'restart') {
            setRestartCount(event.restartCount);
            setPartialText('');
            setLatestEvent({
                label: 'Restart',
                detail: `Restarted internal provider session #${event.restartCount}.`,
            });
            return;
        }

        if (event.providerId) {
            setCurrentProviderId(event.providerId);
        }

        if (event.diagnostics) {
            setCurrentProviderDiagnostics(event.diagnostics);
        }
    };

    /**
     * Applies one speech-recognition event to the page state.
     */
    const handleRecognitionEvent = (event: SpeechRecognitionEvent) => {
        if (event.type === 'START') {
            setIsRunning(true);
            setLatestEvent({
                label: 'Recording',
                detail: 'Recording is active.',
            });
            return;
        }

        if (event.type === 'TRANSCRIBING') {
            setLatestEvent({
                label: 'Transcribing',
                detail: 'Provider is finishing a chunk.',
            });
            return;
        }

        if (event.type === 'RESULT') {
            if (event.isFinal) {
                if (event.text) {
                    setFinalChunks((previousChunks) => [...previousChunks, event.text]);
                }
                setPartialText('');
                setLatestEvent({
                    label: 'Final',
                    detail: createTranscriptPreview(event.text, 'Final chunk'),
                });
                return;
            }

            setPartialText(event.text);
            setLatestEvent({
                label: 'Partial',
                detail: createTranscriptPreview(event.text, 'Partial update'),
            });
            return;
        }

        if (event.type === 'ERROR') {
            setErrorMessage(event.message);
            setLastErrorCode(event.code || null);
            setLatestEvent({
                label: 'Error',
                detail: `${event.code || 'unknown'}: ${event.message}`,
            });
            return;
        }

        setIsRunning(false);
        setLatestEvent({
            label: 'Stopped',
            detail: 'Long-running transcription session stopped.',
        });
    };

    /**
     * Starts a brand new long-running transcription session.
     */
    const handleStart = () => {
        if (isRunning) {
            return;
        }

        stopActiveSession();
        setFinalChunks([]);
        setPartialText('');
        setErrorMessage(null);
        setLastErrorCode(null);
        setRestartCount(0);
        setCurrentProviderId(undefined);
        setCurrentProviderDiagnostics(undefined);
        setRecentTelemetryEntries([]);

        const providerPriority = resolveProviderPriority(providerMode);
        const language = selectedLanguage === 'auto' ? resolveSpeechRecognitionLanguage() : selectedLanguage;

        const session = new LongRunningSpeechRecognitionSession({
            createRecognition: ({ onTelemetry }) =>
                createDefaultSpeechRecognition({
                    providerPriority,
                    onTelemetry,
                }),
            onSessionEvent: handleSessionEvent,
        });

        session.subscribe(handleRecognitionEvent);
        sessionRef.current = session;
        setSessionStartedAtMs(Date.now());
        setElapsedMs(0);
        setLatestEvent({
            label: 'Starting',
            detail: `Starting ${providerMode === 'default' ? 'automatic failover' : providerMode.replace('-', ' ')} session.`,
        });
        session.$start({
            language,
            whisperMode: isWhisperModeEnabled,
            interimResults: true,
        });
    };

    /**
     * Stops the active transcription session immediately.
     */
    const handleStop = () => {
        stopActiveSession();
        setIsRunning(false);
        setSessionStartedAtMs(null);
        setElapsedMs(0);
        setPartialText('');
        setLatestEvent({
            label: 'Stopped',
            detail: 'Stopped by user.',
        });
    };

    useEffect(() => {
        if (!isRunning || !sessionStartedAtMs) {
            return;
        }

        const interval = setInterval(() => {
            setElapsedMs(Date.now() - sessionStartedAtMs);
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [isRunning, sessionStartedAtMs]);

    useEffect(() => {
        return () => {
            stopActiveSession();
        };
    }, []);

    const transcriptText = useMemo(() => {
        return [...finalChunks, partialText].filter(Boolean).join('\n');
    }, [finalChunks, partialText]);

    const currentProviderLabel = currentProviderId ? PROVIDER_LABELS[currentProviderId] : 'Waiting for provider selection';

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="mt-20 mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl text-gray-900 font-light">Transcriptions</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                        Long-running speech-to-text test page for extended sessions. It keeps one outer transcription session
                        alive while restarting short-lived providers when they stall or end unexpectedly.
                    </p>
                </div>
            </div>

            <Card>
                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Provider mode</label>
                        <select
                            value={providerMode}
                            onChange={(event) => setProviderMode(event.target.value as ProviderMode)}
                            disabled={isRunning}
                            className="w-full rounded border border-gray-300 p-2"
                        >
                            <option value="default">Automatic failover (OpenAI -&gt; Browser)</option>
                            <option value="openai-only">OpenAI Whisper only</option>
                            <option value="browser-only">Browser Web Speech only</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Language</label>
                        <select
                            value={selectedLanguage}
                            onChange={(event) => setSelectedLanguage(event.target.value as (typeof LANGUAGE_OPTIONS)[number]['value'])}
                            disabled={isRunning}
                            className="w-full rounded border border-gray-300 p-2"
                        >
                            {LANGUAGE_OPTIONS.map((languageOption) => (
                                <option key={languageOption.value} value={languageOption.value}>
                                    {languageOption.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <label className="flex items-center gap-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={isWhisperModeEnabled}
                            onChange={(event) => setIsWhisperModeEnabled(event.target.checked)}
                            disabled={isRunning}
                        />
                        More sensitive whisper mode
                    </label>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={handleStart}
                        disabled={isRunning}
                        className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Start
                    </button>
                    <button
                        type="button"
                        onClick={handleStop}
                        disabled={!isRunning}
                        className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Stop
                    </button>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <StatusTile title="Elapsed">{formatElapsedTime(elapsedMs)}</StatusTile>
                    <StatusTile title="Current provider">{currentProviderLabel}</StatusTile>
                    <StatusTile title="Last event">
                        <div className="font-medium">{latestEvent.label}</div>
                        {latestEvent.detail && <div className="mt-1 text-xs text-gray-500">{latestEvent.detail}</div>}
                    </StatusTile>
                </div>

                {errorMessage && (
                    <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <strong>Error:</strong> {errorMessage}
                    </div>
                )}

                <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-medium text-gray-900">Transcript</h2>
                        <span className="text-xs text-gray-500">{restartCount} restart(s)</span>
                    </div>

                    <div className="min-h-72 rounded border border-gray-200 bg-gray-50 p-4">
                        {transcriptText ? (
                            <div className="space-y-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                                {finalChunks.map((chunk, index) => (
                                    <p key={`${index}:${chunk}`} className="rounded bg-white px-3 py-2 shadow-sm">
                                        {chunk}
                                    </p>
                                ))}
                                {partialText && (
                                    <p className="rounded border border-dashed border-blue-200 bg-blue-50 px-3 py-2 italic text-blue-900">
                                        {partialText}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">Transcript output will appear here once the session starts.</p>
                        )}
                    </div>
                </div>

                <details className="mt-6 rounded border border-gray-200 bg-gray-50 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-800">Diagnostics</summary>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="space-y-3">
                            <DiagnosticsRow label="Current provider ID" value={currentProviderId || 'n/a'} />
                            <DiagnosticsRow
                                label="Supports partials"
                                value={
                                    typeof currentProviderDiagnostics?.supportsPartials === 'boolean'
                                        ? currentProviderDiagnostics.supportsPartials
                                            ? 'Yes'
                                            : 'No'
                                        : 'Unknown'
                                }
                            />
                            <DiagnosticsRow
                                label="Limitations"
                                value={currentProviderDiagnostics?.limitations || 'No provider diagnostics reported yet.'}
                            />
                            <DiagnosticsRow label="Last error code" value={lastErrorCode || 'n/a'} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-gray-800">Recent telemetry</h3>
                            <pre className="max-h-72 overflow-auto rounded border border-gray-200 bg-white p-3 text-xs leading-5 text-gray-700">
                                {recentTelemetryEntries.length > 0
                                    ? JSON.stringify(recentTelemetryEntries, null, 2)
                                    : 'No telemetry captured yet.'}
                            </pre>
                        </div>
                    </div>
                </details>
            </Card>
        </div>
    );
}

/**
 * Small labeled status block used in the page header.
 */
function StatusTile({
    title,
    children,
}: {
    readonly title: string;
    readonly children: ReactNode;
}) {
    return (
        <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
            <div className="mt-1 text-sm text-gray-900">{children}</div>
        </div>
    );
}

/**
 * Compact two-column diagnostics row.
 */
function DiagnosticsRow({
    label,
    value,
}: {
    readonly label: string;
    readonly value: string;
}) {
    return (
        <div className="rounded border border-gray-200 bg-white px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
            <div className="mt-1 text-sm text-gray-900">{value}</div>
        </div>
    );
}

/**
 * Resolves provider priority list from the chosen testing mode.
 */
function resolveProviderPriority(providerMode: ProviderMode): ReadonlyArray<SpeechToTextProviderKey> {
    if (providerMode === 'openai-only') {
        return ['openai'];
    }

    if (providerMode === 'browser-only') {
        return ['browser'];
    }

    return ['openai', 'browser'];
}

/**
 * Formats elapsed milliseconds into `hh:mm:ss`.
 */
function formatElapsedTime(elapsedMs: number): string {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const hours = Math.floor(totalSeconds / 3600)
        .toString()
        .padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60)
        .toString()
        .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Creates a short transcript preview for status labels.
 */
function createTranscriptPreview(text: string, prefix: string): string {
    const normalizedText = text.trim();
    if (!normalizedText) {
        return `${prefix}.`;
    }

    const preview = normalizedText.length > 80 ? `${normalizedText.slice(0, 77)}...` : normalizedText;
    return `${prefix}: ${preview}`;
}
