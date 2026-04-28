'use client';

import { BookEditor } from '@promptbook-local/components';
import type { AgentBasicInformation, string_book, string_url } from '@promptbook-local/types';
import { AlertTriangleIcon, ChevronDownIcon, CodeIcon, DownloadIcon, PencilIcon } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { MonacoEditorWithShadowDom } from '../../../../components/_utils/MonacoEditorWithShadowDom';
import { usePromptbookTheme } from '../../../../components/ThemeMode/usePromptbookTheme';
import { downloadBlob, parseFilenameFromContentDisposition } from '../../../../utils/download/browserFileDownload';
import { getTranspiledCodeFileMetadata } from '../../../../utils/transpilers/getTranspiledCodeFileMetadata';
import type { TranspiledAgentExportWarning } from '../../../../utils/transpilers/getTranspiledAgentExportWarnings';
import { resolveAgentAvatarImageUrl } from '../../../../../../../src/utils/agents/resolveAgentAvatarImageUrl';

/**
 * Type describing one selectable transpiler.
 */
type Transpiler = {
    readonly name: string;
    readonly title: string;
};

/**
 * Minimal payload returned by the transpiler-list endpoint.
 */
type TranspilerListResponse = {
    readonly transpilers?: Array<Transpiler>;
};

/**
 * Result returned by the transpilation endpoint.
 */
type TranspilationResult = {
    readonly code: string;
    readonly transpiler: Transpiler;
};

/**
 * Minimal API error payload accepted from export endpoints.
 */
type TranspiledCodeApiErrorPayload = {
    readonly error?: string;
    readonly message?: string;
};

/**
 * Props for one page section card.
 */
type AgentCodePageSectionProps = {
    /**
     * Section heading shown above the content.
     */
    readonly title: string;

    /**
     * Supporting copy shown under the title.
     */
    readonly description: string;

    /**
     * Optional header actions rendered beside the title.
     */
    readonly actions?: ReactNode;

    /**
     * Main section content.
     */
    readonly children: ReactNode;
};

/**
 * Props for the export-as-transpiled-code page client.
 */
type AgentCodePageClientProps = {
    /**
     * Routed agent name.
     */
    readonly agentName: string;

    /**
     * Stored source book shown in the read-only Book viewer.
     */
    readonly agentSource: string_book;

    /**
     * Base URL of the Agents Server.
     *
     * Note: [👭] Using `string_url`, not `URL`, because the value crosses the server/client boundary.
     */
    readonly publicUrl: string_url;

    /**
     * Warnings about commitments that cannot be transpiled 1:1.
     */
    readonly exportWarnings: ReadonlyArray<TranspiledAgentExportWarning>;
};

/**
 * Creates the JSON export API path for one agent.
 *
 * @param agentName - Routed agent name.
 * @returns Relative API path used for transpiler listing and code generation.
 */
function createTranspiledCodeApiPath(agentName: string): string {
    return `/agents/${encodeURIComponent(agentName)}/export-as-transpiled-code/api`;
}

/**
 * Creates the ZIP download API path for one agent and selected transpiler.
 *
 * @param agentName - Routed agent name.
 * @param transpilerName - Selected transpiler identifier.
 * @returns Relative download URL with the selected transpiler encoded in the query string.
 */
function createTranspiledCodeDownloadApiPath(agentName: string, transpilerName: string): string {
    const searchParams = new URLSearchParams({ transpilerName });
    return `${createTranspiledCodeApiPath(agentName)}/download?${searchParams.toString()}`;
}

/**
 * Reads a user-facing API error from a failed export response.
 *
 * @param response - Failed HTTP response.
 * @param fallbackMessage - Fallback message when the body has no structured error.
 * @returns Friendly error message suitable for rendering in the UI.
 */
async function resolveTranspiledCodeApiErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
    try {
        const payload = (await response.json()) as TranspiledCodeApiErrorPayload;
        const message = payload.message || payload.error;

        if (message && message.trim().length > 0) {
            return message.trim();
        }
    } catch {
        // Keep the fallback message when the error body is not valid JSON.
    }

    return fallbackMessage;
}

/**
 * Resolves the avatar image URL for the current agent header.
 *
 * @param options - Agent identity and loaded profile data.
 * @returns Avatar URL preferred by the profile, falling back to the default generated avatar.
 */
function resolveAgentAvatarSource(options: {
    readonly agentName: string;
    readonly agentProfile: AgentBasicInformation | null;
    readonly publicUrl: string_url;
}): string {
    const { agentName, agentProfile, publicUrl } = options;
    const fallbackIdentifier = agentProfile?.permanentId || agentName;

    if (!agentProfile) {
        return `/agents/${encodeURIComponent(fallbackIdentifier)}/images/default-avatar.png`;
    }

    return (
        resolveAgentAvatarImageUrl({
            agent: agentProfile,
            baseUrl: publicUrl,
        }) || `/agents/${encodeURIComponent(fallbackIdentifier)}/images/default-avatar.png`
    );
}

/**
 * Shared card section used on the export page.
 */
function AgentCodePageSection({ title, description, actions, children }: AgentCodePageSectionProps) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
                </div>

                {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
            </div>

            <div className="p-5">{children}</div>
        </section>
    );
}

/**
 * Props for the export warning banner.
 */
type TranspiledCodeExportWarningBannerProps = {
    /**
     * Non-transpilable commitment warnings computed for the current agent.
     */
    readonly warnings: ReadonlyArray<TranspiledAgentExportWarning>;
};

/**
 * Renders a warning banner when the current agent uses commitments that cannot be exported 1:1.
 */
function TranspiledCodeExportWarningBanner({ warnings }: TranspiledCodeExportWarningBannerProps) {
    if (warnings.length === 0) {
        return null;
    }

    return (
        <div
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
            role="alert"
        >
            <div className="flex items-start gap-3">
                <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold">
                        Some agent functionality cannot be transpiled exactly.
                    </p>
                    <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/80">
                        The exported code may not behave 1:1 with the live agent in Agents Server.
                    </p>

                    <ul className="mt-3 space-y-3">
                        {warnings.map((warning) => (
                            <li key={warning.commitmentName} className="flex gap-2">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                        <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[0.85em] text-amber-950 dark:bg-amber-900/60 dark:text-amber-100">
                                            {warning.commitmentName}
                                        </code>
                                    </p>
                                    <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/80">
                                        {warning.description}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

/**
 * Handles the export-as-transpiled-code page.
 */
export function AgentCodePageClient({
    agentName,
    agentSource,
    publicUrl,
    exportWarnings,
}: AgentCodePageClientProps) {
    const { promptbookTheme } = usePromptbookTheme();
    const [agentProfile, setAgentProfile] = useState<AgentBasicInformation | null>(null);
    const [transpilers, setTranspilers] = useState<Array<Transpiler>>([]);
    const [selectedTranspilerName, setSelectedTranspilerName] = useState('');
    const [transpiledCode, setTranspiledCode] = useState('');
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [isTranspiling, setIsTranspiling] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pageErrorMessage, setPageErrorMessage] = useState<string | null>(null);
    const [transpileErrorMessage, setTranspileErrorMessage] = useState<string | null>(null);
    const [downloadErrorMessage, setDownloadErrorMessage] = useState<string | null>(null);

    const selectedTranspiler = transpilers.find((transpiler) => transpiler.name === selectedTranspilerName) || null;
    const agentDisplayName = agentProfile?.meta.fullname || agentName;
    const agentAvatarSource = resolveAgentAvatarSource({ agentName, agentProfile, publicUrl });

    useEffect(() => {
        const abortController = new AbortController();
        let isDisposed = false;

        setIsPageLoading(true);
        setPageErrorMessage(null);
        setTranspileErrorMessage(null);
        setDownloadErrorMessage(null);
        setAgentProfile(null);
        setTranspiledCode('');
        setTranspilers([]);
        setSelectedTranspilerName('');

        void (async () => {
            try {
                const response = await fetch(createTranspiledCodeApiPath(agentName), {
                    method: 'GET',
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    throw new Error(await resolveTranspiledCodeApiErrorMessage(response, 'Failed to load transpilers'));
                }

                const payload = (await response.json()) as TranspilerListResponse;
                if (isDisposed) {
                    return;
                }

                const nextTranspilers = payload.transpilers || [];
                setTranspilers(nextTranspilers);
                setSelectedTranspilerName(nextTranspilers[0]?.name || '');
            } catch (error) {
                if (abortController.signal.aborted || isDisposed) {
                    return;
                }

                setPageErrorMessage(error instanceof Error ? error.message : 'Failed to load transpilers');
            } finally {
                if (!isDisposed) {
                    setIsPageLoading(false);
                }
            }
        })();

        void (async () => {
            try {
                const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/profile`, {
                    method: 'GET',
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    return;
                }

                const profile = (await response.json()) as AgentBasicInformation;
                if (!isDisposed) {
                    setAgentProfile(profile);
                }
            } catch (error) {
                if (!abortController.signal.aborted) {
                    console.error('Error fetching agent profile:', error);
                }
            }
        })();

        return () => {
            isDisposed = true;
            abortController.abort();
        };
    }, [agentName]);

    useEffect(() => {
        if (!selectedTranspilerName) {
            setIsTranspiling(false);
            setTranspiledCode('');
            return;
        }

        const abortController = new AbortController();
        let isDisposed = false;

        setIsTranspiling(true);
        setTranspileErrorMessage(null);
        setDownloadErrorMessage(null);
        setTranspiledCode('');

        void (async () => {
            try {
                const response = await fetch(createTranspiledCodeApiPath(agentName), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ transpilerName: selectedTranspilerName }),
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    throw new Error(await resolveTranspiledCodeApiErrorMessage(response, 'Failed to transpile code'));
                }

                const result = (await response.json()) as TranspilationResult;
                if (!isDisposed) {
                    setTranspiledCode(result.code);
                }
            } catch (error) {
                if (abortController.signal.aborted || isDisposed) {
                    return;
                }

                setTranspileErrorMessage(error instanceof Error ? error.message : 'Failed to transpile code');
            } finally {
                if (!isDisposed) {
                    setIsTranspiling(false);
                }
            }
        })();

        return () => {
            isDisposed = true;
            abortController.abort();
        };
    }, [agentName, selectedTranspilerName]);

    /**
     * Downloads the selected transpiled harness as a ZIP archive.
     */
    const handleDownloadTranspiledCode = useCallback(async () => {
        if (!selectedTranspilerName || isDownloading) {
            return;
        }

        setIsDownloading(true);
        setDownloadErrorMessage(null);

        try {
            const response = await fetch(createTranspiledCodeDownloadApiPath(agentName, selectedTranspilerName), {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(await resolveTranspiledCodeApiErrorMessage(response, 'Failed to download ZIP export'));
            }

            const filename =
                parseFilenameFromContentDisposition(response.headers.get('Content-Disposition')) ||
                'promptbook-agent-export.zip';
            const exportBlob = await response.blob();
            downloadBlob(exportBlob, filename);
        } catch (error) {
            setDownloadErrorMessage(error instanceof Error ? error.message : 'Failed to download ZIP export');
        } finally {
            setIsDownloading(false);
        }
    }, [agentName, isDownloading, selectedTranspilerName]);

    const downloadButtonLabel = isDownloading ? 'Preparing ZIP...' : 'Download ZIP';
    const isDownloadButtonDisabled = !selectedTranspilerName || isPageLoading || isTranspiling || isDownloading;

    return (
        <div className="min-h-screen bg-slate-50 px-6 py-8 md:px-12 dark:bg-slate-950">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-6 sm:flex-row sm:items-center dark:border-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={agentAvatarSource}
                            alt={agentDisplayName}
                            className="agent-avatar-pixelated h-16 w-16 rounded-full border-2 border-slate-200 object-cover dark:border-slate-700"
                        />

                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {agentDisplayName}
                            </h1>
                            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <CodeIcon className="h-4 w-4" />
                                Export as transpiled code / agent harness
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 p-6">
                        <AgentCodePageSection
                            title="Source Book"
                            description="Review the stored Book source used to create this agent. Editing stays in the dedicated Book editor."
                            actions={
                                <Link
                                    href={`/agents/${encodeURIComponent(agentName)}/book`}
                                    className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    <PencilIcon className="h-4 w-4" />
                                    Edit Book
                                </Link>
                            }
                        >
                            <div className="h-[28rem] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                <BookEditor
                                    className="h-full w-full"
                                    height={null}
                                    value={agentSource}
                                    isReadonly
                                    isUploadButtonShown={false}
                                    isCameraButtonShown={false}
                                    isDownloadButtonShown={false}
                                    isAboutButtonShown={false}
                                    isFullscreenButtonShown={false}
                                    translations={{ readonlyMessage: 'Use Edit Book to change the source.' }}
                                    theme={promptbookTheme}
                                />
                            </div>
                        </AgentCodePageSection>

                        <AgentCodePageSection
                            title="Generated Harness"
                            description="Generate runnable output from the current agent and download the source book plus transpiled harness as one ZIP archive."
                            actions={
                                <button
                                    type="button"
                                    onClick={() => void handleDownloadTranspiledCode()}
                                    disabled={isDownloadButtonDisabled}
                                    className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <DownloadIcon className="h-4 w-4" />
                                    {downloadButtonLabel}
                                </button>
                            }
                        >
                            <div className="space-y-4">
                                <TranspiledCodeExportWarningBanner warnings={exportWarnings} />
                                <div>
                                    <label
                                        htmlFor="agent-code-transpiler"
                                        className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                                    >
                                        Select transpiler
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="agent-code-transpiler"
                                            value={selectedTranspilerName}
                                            onChange={(event) => setSelectedTranspilerName(event.target.value)}
                                            disabled={isPageLoading || transpilers.length === 0}
                                            className="w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                        >
                                            {transpilers.length === 0 ? (
                                                <option value="">
                                                    {isPageLoading ? 'Loading transpilers...' : 'No transpilers available'}
                                                </option>
                                            ) : (
                                                transpilers.map((transpiler) => (
                                                    <option key={transpiler.name} value={transpiler.name}>
                                                        {transpiler.title}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <ChevronDownIcon className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                                    </div>
                                </div>

                                {pageErrorMessage ? (
                                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                                        {pageErrorMessage}
                                    </div>
                                ) : null}

                                {transpileErrorMessage ? (
                                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                                        {transpileErrorMessage}
                                    </div>
                                ) : null}

                                {downloadErrorMessage ? (
                                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                                        {downloadErrorMessage}
                                    </div>
                                ) : null}

                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                            {selectedTranspiler?.title || 'Generated code'}
                                        </h3>
                                        {(isTranspiling || isDownloading) && (
                                            <div className="text-sm text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
                                                {isDownloading ? 'Preparing ZIP archive...' : 'Generating code...'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4">
                                        {transpiledCode ? (
                                            <div className="h-[32rem] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                                <MonacoEditorWithShadowDom
                                                    value={transpiledCode}
                                                    language={getTranspiledCodeFileMetadata(selectedTranspilerName).language}
                                                    options={{
                                                        readOnly: true,
                                                        minimap: { enabled: false },
                                                        fontSize: 14,
                                                        lineNumbers: 'on',
                                                        scrollBeyondLastLine: false,
                                                        automaticLayout: true,
                                                        wordWrap: 'on',
                                                    }}
                                                    loading={
                                                        <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
                                                            Loading editor...
                                                        </div>
                                                    }
                                                />
                                            </div>
                                        ) : isTranspiling ? (
                                            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                                Generating code...
                                            </div>
                                        ) : selectedTranspilerName ? (
                                            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                                Generated code will appear here.
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                                                Select a transpiler to generate code.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </AgentCodePageSection>
                    </div>
                </div>
            </div>
        </div>
    );
}
