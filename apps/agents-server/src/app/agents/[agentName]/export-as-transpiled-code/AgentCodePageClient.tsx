'use client';

import type { string_book, string_url } from '@promptbook-local/types';
import type { TranspiledAgentExportWarning } from '../../../../utils/transpilers/getTranspiledAgentExportWarnings';
import { AgentCodePageHeader } from './AgentCodePageHeader';
import { GeneratedHarnessSection } from './GeneratedHarnessSection';
import { SourceBookSection } from './SourceBookSection';
import { useAgentCodeExportState } from './useAgentCodeExportState';

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
 * Handles the export-as-transpiled-code page.
 */
export function AgentCodePageClient({ agentName, agentSource, publicUrl, exportWarnings }: AgentCodePageClientProps) {
    const state = useAgentCodeExportState(agentName);

    return (
        <div className="min-h-screen bg-slate-50 px-6 py-8 md:px-12 dark:bg-slate-950">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <AgentCodePageHeader
                        agentName={agentName}
                        agentProfile={state.agentProfile}
                        publicUrl={publicUrl}
                    />

                    <div className="grid gap-6 p-6">
                        <SourceBookSection agentName={agentName} agentSource={agentSource} />
                        <GeneratedHarnessSection state={state} exportWarnings={exportWarnings} />
                    </div>
                </div>
            </div>
        </div>
    );
}
