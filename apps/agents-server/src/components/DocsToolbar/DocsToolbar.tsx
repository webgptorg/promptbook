'use client';

import { ChevronDown, Download } from 'lucide-react';
import { useState } from 'react';
import type { BookLanguageDocumentationAgentOption } from '../../utils/bookLanguageDocumentation/BookLanguageDocumentationAgent';
import { downloadBlob, parseFilenameFromContentDisposition } from '../../utils/download/browserFileDownload';
import { showAlert } from '../AsyncDialogs/asyncDialogs';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';
import { OpenMojiIcon } from '../OpenMojiIcon/OpenMojiIcon';

/**
 * Supported Book language manual download formats.
 */
type BookLanguageDocumentationExportFormat = 'pdf' | 'markdown';

/**
 * Props for the documentation toolbar.
 */
type DocsToolbarProps = {
    /**
     * Current server agents eligible to be baked into a manual export.
     */
    readonly agents: ReadonlyArray<BookLanguageDocumentationAgentOption>;
};

/**
 * Fallback filenames used when an export response does not provide one.
 */
const BOOK_LANGUAGE_DOCUMENTATION_EXPORT_FILENAMES: Readonly<Record<BookLanguageDocumentationExportFormat, string>> = {
    pdf: 'book-language-manual.pdf',
    markdown: 'book-language-manual.md',
};

/**
 * Handles docs toolbar and Book language manual exports.
 */
export function DocsToolbar({ agents }: DocsToolbarProps) {
    const { availableLanguages, language, t } = useServerLanguage();
    const [isExportOptionsOpen, setIsExportOptionsOpen] = useState(false);
    const [isManualDownloading, setIsManualDownloading] = useState(false);
    const [exportFormat, setExportFormat] = useState<BookLanguageDocumentationExportFormat>('pdf');
    const [exportLanguage, setExportLanguage] = useState(language);
    const [selectedAgentIds, setSelectedAgentIds] = useState<ReadonlySet<string>>(
        () => new Set(agents.map((agent) => agent.id)),
    );

    const selectedAgentCount = selectedAgentIds.size;

    async function downloadManual(): Promise<void> {
        if (isManualDownloading) {
            return;
        }

        setIsManualDownloading(true);

        try {
            const response = await fetch(
                createBookLanguageDocumentationExportUrl(exportFormat, exportLanguage, selectedAgentIds),
            );

            if (!response.ok) {
                throw new Error(await resolveBookLanguageDocumentationExportError(response));
            }

            const filename =
                parseFilenameFromContentDisposition(response.headers.get('Content-Disposition')) ||
                BOOK_LANGUAGE_DOCUMENTATION_EXPORT_FILENAMES[exportFormat];
            downloadBlob(await response.blob(), filename);
        } catch (error) {
            await showAlert({
                title: t('documentation.downloadFailedTitle'),
                message: error instanceof Error ? error.message : t('documentation.downloadFailedMessage'),
            }).catch(() => undefined);
        } finally {
            setIsManualDownloading(false);
        }
    }

    function toggleAgentSelection(agentId: string): void {
        setSelectedAgentIds((currentSelectedAgentIds) => {
            const nextSelectedAgentIds = new Set(currentSelectedAgentIds);

            if (nextSelectedAgentIds.has(agentId)) {
                nextSelectedAgentIds.delete(agentId);
            } else {
                nextSelectedAgentIds.add(agentId);
            }

            return nextSelectedAgentIds;
        });
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 mb-8 bg-white rounded-xl shadow-sm border border-gray-100 print:hidden dark:border-slate-700 dark:bg-slate-900/92 dark:shadow-slate-950/30">
            <div className="flex items-center gap-2">
                <OpenMojiIcon icon="📚" className="text-2xl" />
                <span className="font-semibold text-gray-700 dark:text-slate-100">
                    {t('header.documentationMenuLabel')}
                </span>
            </div>

            <div className="relative">
                <div className="flex">
                    <button
                        type="button"
                        onClick={() => void downloadManual()}
                        disabled={isManualDownloading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-l-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:cursor-wait disabled:opacity-70 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-100 dark:hover:bg-blue-500/25 dark:focus:ring-offset-slate-950"
                        title={t('documentation.downloadManual')}
                    >
                        <Download className="w-4 h-4" />
                        {isManualDownloading ? t('documentation.preparingManual') : t('documentation.downloadManual')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsExportOptionsOpen((isOpen) => !isOpen)}
                        className="px-2 py-2 text-blue-700 bg-blue-50 border border-l-0 border-blue-200 rounded-r-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-100 dark:hover:bg-blue-500/25 dark:focus:ring-offset-slate-950"
                        aria-expanded={isExportOptionsOpen}
                        aria-controls="book-language-manual-export-options"
                        aria-label={t('documentation.openDownloadOptions')}
                    >
                        <ChevronDown
                            className={`w-4 h-4 transition-transform ${isExportOptionsOpen ? 'rotate-180' : ''}`}
                        />
                    </button>
                </div>

                {isExportOptionsOpen && (
                    <div
                        id="book-language-manual-export-options"
                        className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                    >
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-100">
                                <span>{t('documentation.exportFormatLabel')}</span>
                                <select
                                    value={exportFormat}
                                    onChange={(event) =>
                                        setExportFormat(event.target.value as BookLanguageDocumentationExportFormat)
                                    }
                                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                                >
                                    <option value="pdf">PDF</option>
                                    <option value="markdown">Markdown</option>
                                </select>
                            </label>

                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-100">
                                <span>{t('documentation.exportLanguageLabel')}</span>
                                <select
                                    value={exportLanguage}
                                    onChange={(event) => setExportLanguage(event.target.value as typeof language)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                                >
                                    {availableLanguages.map((languagePack) => (
                                        <option key={languagePack.language} value={languagePack.language}>
                                            {languagePack.nativeName}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <fieldset>
                                <legend className="text-sm font-medium text-gray-700 dark:text-slate-100">
                                    {t('documentation.bakedAgentsLabel')}
                                </legend>
                                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                    {selectedAgentCount === 0
                                        ? t('documentation.noBakedAgentsHint')
                                        : t('documentation.bakedAgentsHint', { count: selectedAgentCount })}
                                </p>
                                <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                                    {agents.map((agent) => (
                                        <label
                                            key={agent.id}
                                            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedAgentIds.has(agent.id)}
                                                onChange={() => toggleAgentSelection(agent.id)}
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>{agent.name}</span>
                                        </label>
                                    ))}
                                    {agents.length === 0 && (
                                        <p className="py-1 text-sm text-gray-500 dark:text-slate-400">
                                            {t('documentation.noAgentsAvailable')}
                                        </p>
                                    )}
                                </div>
                            </fieldset>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Creates one Book language manual export URL from the currently selected options.
 *
 * @param exportFormat - Requested file format.
 * @param exportLanguage - Requested manual language metadata.
 * @param selectedAgentIds - Agents to bake into the manual.
 * @returns Same-origin manual download URL.
 *
 * @private internal utility of `DocsToolbar`
 */
function createBookLanguageDocumentationExportUrl(
    exportFormat: BookLanguageDocumentationExportFormat,
    exportLanguage: string,
    selectedAgentIds: ReadonlySet<string>,
): string {
    const searchParams = new URLSearchParams({ language: exportLanguage });

    if (selectedAgentIds.size === 0) {
        searchParams.set('agents', 'none');
    } else {
        for (const agentId of selectedAgentIds) {
            searchParams.append('agent', agentId);
        }
    }

    const endpoint = exportFormat === 'pdf' ? '/api/docs/book-language.pdf' : '/api/docs/book-language.md';
    return `${endpoint}?${searchParams.toString()}`;
}

/**
 * Reads a meaningful export error message from an API response.
 *
 * @param response - Failed manual export response.
 * @returns User-facing error text.
 *
 * @private internal utility of `DocsToolbar`
 */
async function resolveBookLanguageDocumentationExportError(response: Response): Promise<string> {
    try {
        const payload = (await response.json()) as { error?: string; message?: string };
        const message = payload.message || payload.error;

        if (message?.trim()) {
            return message.trim();
        }
    } catch {
        // Keep the generic fallback when a failed binary export has no JSON body.
    }

    return 'Failed to download the Book language manual.';
}
