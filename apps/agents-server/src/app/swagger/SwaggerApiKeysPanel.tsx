'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SecretInput } from '@/src/components/SecretInput/SecretInput';
import type { ApiTokenEntry } from '@/src/utils/apiTokensClient';
import { createApiToken, fetchApiTokens } from '@/src/utils/apiTokensClient';

/**
 * Props for the compact Swagger API-key panel.
 */
type SwaggerApiKeysPanelProps = {
    /**
     * Whether the current page viewer is allowed to manage API keys.
     */
    isAdmin: boolean;
};

/**
 * Compact API-key panel shown above Swagger UI.
 */
export function SwaggerApiKeysPanel({ isAdmin }: SwaggerApiKeysPanelProps) {
    const [tokens, setTokens] = useState<ApiTokenEntry[]>([]);
    const [isLoading, setIsLoading] = useState(isAdmin);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Loads API keys for the current admin user.
     */
    const loadTokens = async () => {
        if (!isAdmin) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            setTokens(await fetchApiTokens());
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Failed to load API keys.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isAdmin) {
            return;
        }

        void (async () => {
            setIsLoading(true);
            setError(null);

            try {
                setTokens(await fetchApiTokens());
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Failed to load API keys.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [isAdmin]);

    /**
     * Creates one API key dedicated to Swagger usage.
     */
    const handleCreateToken = async () => {
        setIsCreating(true);
        setError(null);

        try {
            await createApiToken('Swagger UI');
            await loadTokens();
        } catch (createError) {
            setError(createError instanceof Error ? createError.message : 'Failed to create API key.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 mb-6">
            <div className="flex flex-col gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Management API Explorer</h1>
                    <p className="text-sm text-slate-600 mt-1">
                        Use the Swagger <span className="font-semibold">Authorize</span> button with an Agents Server
                        API key.
                    </p>
                </div>

                {isAdmin ? (
                    <>
                        <div className="grid gap-3">
                            {isLoading ? (
                                <p className="text-sm text-slate-500">Loading API keys...</p>
                            ) : tokens.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    No API keys found for this user. Create one to start testing the management API.
                                </p>
                            ) : (
                                tokens.map((token) => (
                                    <div key={token.id} className="space-y-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                {token.note || `API key #${token.id}`}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(token.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <SecretInput value={token.token} readOnly aria-label={`API key ${token.id}`} />
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => void handleCreateToken()}
                                disabled={isCreating}
                                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Plus className="h-4 w-4" />
                                {isCreating ? 'Creating...' : 'Create API Key'}
                            </button>
                            <Link href="/admin/api-tokens" className="text-sm font-medium text-slate-700 underline">
                                Manage keys
                            </Link>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-slate-600">
                        This page supports API-key authorization, but only admins can view or create keys here.
                    </p>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
        </section>
    );
}
