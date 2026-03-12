'use client';

import {
    DEFAULT_TOOL_USAGE_LIMITS,
    DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS,
    TOOL_USAGE_LIMITS_METADATA_KEY,
    type ToolUsageLimits,
} from '@/src/constants/toolUsageLimits';
import { useEffect, useState } from 'react';
import { Card } from '../../../components/Homepage/Card';

/**
 * Shared class names for numeric limit inputs.
 *
 * @private client-side tool limits constant
 */
const TOOL_LIMIT_INPUT_CLASS_NAME =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Renders the admin page for configuring thread-scoped timeout usage caps.
 */
export function ToolLimitsClient() {
    const [limits, setLimits] = useState<ToolUsageLimits>(() => ({
        ...DEFAULT_TOOL_USAGE_LIMITS,
        timeout: { ...DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS },
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
                const response = await fetch('/api/admin/tool-limits', {
                    method: 'GET',
                    cache: 'no-store',
                });

                if (!response.ok) {
                    const payload = (await response.json().catch(() => ({}))) as { error?: string };
                    throw new Error(payload.error || 'Failed to load tool limits.');
                }

                const nextLimits = (await response.json()) as ToolUsageLimits;
                if (!isDisposed) {
                    setLimits(nextLimits);
                }
            } catch (error) {
                if (!isDisposed) {
                    setErrorMessage(error instanceof Error ? error.message : 'Failed to load tool limits.');
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
     * Updates one numeric timeout limit while keeping the future-extensible payload shape intact.
     */
    const setTimeoutLimit = (field: 'maxActivePerChat' | 'maxFiredPerDayPerChat', value: number): void => {
        setLimits((currentLimits) => ({
            ...currentLimits,
            timeout: {
                ...currentLimits.timeout,
                [field]: value,
            },
        }));
    };

    /**
     * Persists the current limits through the admin API.
     */
    const saveLimits = async (): Promise<void> => {
        try {
            setIsSaving(true);
            setErrorMessage(null);
            setSuccessMessage(null);
            const response = await fetch('/api/admin/tool-limits', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(limits),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => ({}))) as { error?: string };
                throw new Error(payload.error || 'Failed to save tool limits.');
            }

            const savedLimits = (await response.json()) as ToolUsageLimits;
            setLimits(savedLimits);
            setSuccessMessage('Tool limits were saved.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to save tool limits.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto space-y-6 px-4 py-8">
            <div className="mt-20 flex flex-col gap-3">
                <div>
                    <h1 className="text-3xl font-light text-gray-900">Tool limits</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                        Configure thread-scoped timeout caps enforced by the runtime. The payload is stored under the
                        metadata key <span className="font-mono text-gray-700">{TOOL_USAGE_LIMITS_METADATA_KEY}</span>{' '}
                        so the schema can grow to other tools later.
                    </p>
                </div>
            </div>

            <Card className="hover:border-gray-200 hover:shadow-md">
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                            <span className="block text-sm font-semibold text-gray-800">Max active timers per chat</span>
                            <input
                                type="number"
                                min={1}
                                value={limits.timeout.maxActivePerChat}
                                onChange={(event) =>
                                    setTimeoutLimit(
                                        'maxActivePerChat',
                                        Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                                    )
                                }
                                className={TOOL_LIMIT_INPUT_CLASS_NAME}
                                disabled={isLoading || isSaving}
                            />
                            <p className="text-xs text-gray-500">
                                Prevents one chat thread from scheduling too many timers at once.
                            </p>
                        </label>

                        <label className="space-y-2">
                            <span className="block text-sm font-semibold text-gray-800">Max timers fired per day per chat</span>
                            <input
                                type="number"
                                min={1}
                                value={limits.timeout.maxFiredPerDayPerChat}
                                onChange={(event) =>
                                    setTimeoutLimit(
                                        'maxFiredPerDayPerChat',
                                        Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                                    )
                                }
                                className={TOOL_LIMIT_INPUT_CLASS_NAME}
                                disabled={isLoading || isSaving}
                            />
                            <p className="text-xs text-gray-500">
                                Limits how many scheduled wake-ups can execute inside one chat within one UTC day.
                            </p>
                        </label>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Default timeout limits: {DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS.maxActivePerChat} active timers per
                        chat and {DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS.maxFiredPerDayPerChat} fired timers per day per
                        chat.
                    </div>

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
                                setLimits((currentLimits) => ({
                                    ...currentLimits,
                                    timeout: { ...DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS },
                                }));
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
            </Card>
        </div>
    );
}
