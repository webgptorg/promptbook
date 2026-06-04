'use client';

import { useEffect, useState } from 'react';
import { Card } from '../../../components/Homepage/Card';
import {
    DEFAULT_SERVER_LIMIT_VALUES,
    DEPRECATED_LIMIT_METADATA_KEYS,
    SERVER_LIMIT_DEFINITIONS,
    getServerLimitDefinition,
    type ServerLimitDefinition,
    type ServerLimitKey,
} from '../../../constants/serverLimits';
import type { ServerLimitValues } from '../../../utils/serverLimits';

/**
 * Shared class names for numeric limit inputs.
 *
 * @private client-side admin limits constant
 */
const LIMIT_INPUT_CLASS_NAME =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Shared categories rendered in the dedicated limits page.
 *
 * @private client-side admin limits constant
 */
const LIMIT_DEFINITIONS_BY_CATEGORY = SERVER_LIMIT_DEFINITIONS.reduce((categories, definition) => {
    if (!categories[definition.category]) {
        categories[definition.category] = [];
    }

    categories[definition.category]!.push(definition);
    return categories;
}, {} as Record<ServerLimitDefinition['category'], Array<ServerLimitDefinition>>);

/**
 * Dedicated admin page for configuring runtime server limits.
 */
export function LimitsClient() {
    const [limits, setLimits] = useState<ServerLimitValues>(() => ({
        ...DEFAULT_SERVER_LIMIT_VALUES,
    }));
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        let isDisposed = false;

        async function loadLimits(): Promise<void> {
            try {
                setIsLoading(true);
                setErrorMessage(null);
                const response = await fetch('/api/admin/limits', {
                    method: 'GET',
                    cache: 'no-store',
                });

                if (!response.ok) {
                    const payload = (await response.json().catch(() => ({}))) as { error?: string };
                    throw new Error(payload.error || 'Failed to load server limits.');
                }

                const nextLimits = (await response.json()) as ServerLimitValues;
                if (!isDisposed) {
                    setLimits(nextLimits);
                }
            } catch (error) {
                if (!isDisposed) {
                    setErrorMessage(error instanceof Error ? error.message : 'Failed to load server limits.');
                }
            } finally {
                if (!isDisposed) {
                    setIsLoading(false);
                }
            }
        }

        void loadLimits();

        return () => {
            isDisposed = true;
        };
    }, []);

    /**
     * Updates one numeric server limit while enforcing the shared minimum bound.
     */
    const setLimitValue = (key: ServerLimitKey, rawValue: string): void => {
        const definition = getServerLimitDefinition(key);
        if (!definition) {
            return;
        }

        const parsedValue = Number.parseInt(rawValue, 10);
        const nextValue = Number.isFinite(parsedValue)
            ? Math.max(definition.minimumValue, parsedValue)
            : definition.minimumValue;

        setLimits((currentLimits) => ({
            ...currentLimits,
            [key]: nextValue,
        }));
        setSuccessMessage(null);
    };

    /**
     * Persists the current dedicated limits through the admin API.
     */
    const saveLimits = async (): Promise<void> => {
        try {
            setIsSaving(true);
            setErrorMessage(null);
            setSuccessMessage(null);
            const response = await fetch('/api/admin/limits', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(limits),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => ({}))) as { error?: string };
                throw new Error(payload.error || 'Failed to save server limits.');
            }

            const savedLimits = (await response.json()) as ServerLimitValues;
            setLimits(savedLimits);
            setSuccessMessage('Server limits were saved.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to save server limits.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="hover:border-gray-200 hover:shadow-md">
                <div className="space-y-3 text-sm text-slate-600">
                    <p>
                        Limits in this page are stored in the dedicated <span className="font-mono">ServerLimit</span>{' '}
                        table. Saving also mirrors deprecated metadata keys{' '}
                        <span className="font-mono">{DEPRECATED_LIMIT_METADATA_KEYS.join(', ')}</span> so older Agents
                        Server deployments can keep using the same database safely.
                    </p>
                    <p>
                        Missing dedicated rows automatically fall back to the legacy metadata values and then to the
                        repository defaults, so existing installations keep their current behavior until limits are
                        saved here.
                    </p>
                </div>
            </Card>

            {Object.entries(LIMIT_DEFINITIONS_BY_CATEGORY).map(([category, definitions]) => (
                <Card key={category} className="hover:border-gray-200 hover:shadow-md">
                    <div className="space-y-5">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">{category}</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {category === 'Timeout tools' &&
                                    'Limits applied while scheduling and firing chat timeout tool actions.'}
                                {category === 'Files' &&
                                    'Limits controlling upload sizes accepted by attachments and share-target imports.'}
                                {category === 'Federation' &&
                                    'Limits used while retrying federated server agent-book imports.'}
                                {category === 'Agent spawning' &&
                                    'Limits protecting the persistent `spawn_agent` tool from accidental or abusive overuse.'}
                                {category === 'Local agent runner' &&
                                    'Limits controlling local coding-agent retries for durable chat messages.'}
                            </p>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                            {definitions.map((definition) => (
                                <label
                                    key={definition.key}
                                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                                >
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-900">
                                                {definition.title}
                                            </span>
                                            <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-500 border border-slate-200">
                                                {definition.key}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500">{definition.description}</p>
                                    </div>

                                    <div className="flex gap-3 items-end">
                                        <div className="flex-1 space-y-2">
                                            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Current value
                                            </span>
                                            <input
                                                type="number"
                                                min={definition.minimumValue}
                                                step={definition.step}
                                                value={limits[definition.key]}
                                                onChange={(event) => setLimitValue(definition.key, event.target.value)}
                                                className={LIMIT_INPUT_CLASS_NAME}
                                                disabled={isLoading || isSaving}
                                            />
                                        </div>
                                        <div className="pb-2 text-sm text-slate-500">{definition.unit}</div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                        <span className="rounded-full bg-white px-2 py-1 border border-slate-200">
                                            Default: {definition.defaultValue} {definition.unit}
                                        </span>
                                        <span className="rounded-full bg-white px-2 py-1 border border-slate-200">
                                            Minimum: {definition.minimumValue} {definition.unit}
                                        </span>
                                        {definition.legacyMetadataKeys.length > 0 && (
                                            <span className="rounded-full bg-amber-50 px-2 py-1 border border-amber-200 text-amber-700">
                                                Legacy metadata mirror: {definition.legacyMetadataKeys.join(', ')}
                                            </span>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </Card>
            ))}

            {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                </div>
            )}
            {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={() => {
                        setLimits({
                            ...DEFAULT_SERVER_LIMIT_VALUES,
                        });
                        setSuccessMessage(null);
                    }}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading || isSaving}
                >
                    Reset to defaults
                </button>
                <button
                    type="button"
                    onClick={() => {
                        void saveLimits();
                    }}
                    className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading || isSaving}
                >
                    {isSaving ? 'Saving…' : 'Save limits'}
                </button>
            </div>
        </div>
    );
}
