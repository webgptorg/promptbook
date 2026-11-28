'use client';

import { ChevronDownIcon, DownloadIcon } from 'lucide-react';
import type { TranspiledAgentExportWarning } from '../../../../utils/transpilers/getTranspiledAgentExportWarnings';
import { AgentCodePageSection } from './AgentCodePageSection';
import { GeneratedCodePreview } from './GeneratedCodePreview';
import { TranspiledCodeErrorBanner } from './TranspiledCodeErrorBanner';
import { TranspiledCodeExportWarningBanner } from './TranspiledCodeExportWarningBanner';
import type { AgentCodeExportState } from './useAgentCodeExportState';

/**
 * Props for the generated harness section.
 *
 * @private type of `<GeneratedHarnessSection/>`
 */
type GeneratedHarnessSectionProps = {
    /**
     * Export page state and actions.
     */
    readonly state: AgentCodeExportState;

    /**
     * Warnings about commitments that cannot be transpiled 1:1.
     */
    readonly exportWarnings: ReadonlyArray<TranspiledAgentExportWarning>;
};

/**
 * Renders the transpiler picker, export warnings/errors, download action, and generated code preview.
 *
 * @private internal component of `<AgentCodePageClient/>`
 */
export function GeneratedHarnessSection({ state, exportWarnings }: GeneratedHarnessSectionProps) {
    return (
        <AgentCodePageSection
            title="Generated Harness"
            description="Generate runnable output from the current agent and download the source book plus transpiled harness as one ZIP archive."
            actions={
                <button
                    type="button"
                    onClick={() => void state.downloadTranspiledCode()}
                    disabled={state.isDownloadButtonDisabled}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <DownloadIcon className="h-4 w-4" />
                    {state.downloadButtonLabel}
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
                            value={state.selectedTranspilerName}
                            onChange={(event) => state.selectTranspiler(event.target.value)}
                            disabled={state.isPageLoading || state.transpilers.length === 0}
                            className="w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        >
                            {state.transpilers.length === 0 ? (
                                <option value="">
                                    {state.isPageLoading ? 'Loading transpilers...' : 'No transpilers available'}
                                </option>
                            ) : (
                                state.transpilers.map((transpiler) => (
                                    <option key={transpiler.name} value={transpiler.name}>
                                        {transpiler.title}
                                    </option>
                                ))
                            )}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                </div>

                <TranspiledCodeErrorBanner message={state.pageErrorMessage} />
                <TranspiledCodeErrorBanner message={state.transpileErrorMessage} />
                <TranspiledCodeErrorBanner message={state.downloadErrorMessage} />

                <GeneratedCodePreview
                    selectedTranspiler={state.selectedTranspiler}
                    selectedTranspilerName={state.selectedTranspilerName}
                    transpiledCode={state.transpiledCode}
                    isTranspiling={state.isTranspiling}
                    isDownloading={state.isDownloading}
                />
            </div>
        </AgentCodePageSection>
    );
}
