import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideExecutionToolsForServer } from '@/src/tools/$provideExecutionToolsForServer';
import { $provideAgentReferenceResolver } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { resolveServerAgentContext } from '@/src/utils/resolveServerAgentContext';
import type { BookTranspiler, string_book, string_script } from '@promptbook-local/types';
import {
    _AnthropicClaudeManagedTranspilerRegistration,
    _AgentOsTranspilerRegistration,
    _AnthropicClaudeSdkTranspilerRegistration,
    _OpenAiAgentsTranspilerRegistration,
    _OpenAiSdkTranspilerRegistration,
} from '@promptbook-local/wizard';
import { $bookTranspilersRegister } from '../../../../../src/transpilers/_common/register/$bookTranspilersRegister';
import { $sideEffect } from '../../../../../src/utils/organization/$sideEffect';
import { createTranspiledAgentExportWarnings } from './createTranspiledAgentExportWarnings';

// Note: Ensure supported export transpilers are registered before listing or resolving them.
$sideEffect(_OpenAiSdkTranspilerRegistration);
$sideEffect(_OpenAiAgentsTranspilerRegistration);
$sideEffect(_AnthropicClaudeSdkTranspilerRegistration);
$sideEffect(_AnthropicClaudeManagedTranspilerRegistration);
$sideEffect(_AgentOsTranspilerRegistration);

/**
 * Public transpiler metadata exposed to the Agents Server export page.
 */
export type ListedBookTranspiler = Pick<BookTranspiler, 'name' | 'title'>;

/**
 * Successful transpiled export payload shared by the JSON and ZIP routes.
 */
export type ResolvedTranspiledAgentCodeExport = {
    /**
     * Canonical stored source book shown on the export page and bundled into ZIP downloads.
     */
    readonly agentSource: string_book;

    /**
     * Generated transpiled code returned to the code viewer and ZIP exporter.
     */
    readonly transpiledCode: string_script;

    /**
     * Selected transpiler metadata.
     */
    readonly transpiler: ListedBookTranspiler;

    /**
     * Warning list describing source capabilities that cannot be reproduced exactly by transpilers.
     */
    readonly warnings: ReturnType<typeof createTranspiledAgentExportWarnings>;
};

/**
 * Lists transpilers currently available on the export-as-transpiled-code page.
 *
 * @returns Registered transpilers reduced to the fields needed by the UI.
 */
export function listBookTranspilersForExport(): Array<ListedBookTranspiler> {
    return $bookTranspilersRegister.list().map((transpiler) => ({
        name: transpiler.name,
        title: transpiler.title,
    }));
}

/**
 * Resolves one registered transpiler by name.
 *
 * @param transpilerName - Registered transpiler name requested by the client.
 * @returns Matching transpiler or `null` when the name is unknown.
 */
export function findBookTranspilerForExport(transpilerName: string): BookTranspiler | null {
    return $bookTranspilersRegister.list().find((transpiler) => transpiler.name === transpilerName) || null;
}

/**
 * Loads the stored agent source and transpiles the resolved runtime book for export.
 *
 * The stored source is shown to the user and bundled into the ZIP archive, while the resolved
 * source is what actually gets transpiled so inherited/imported server context stays aligned with
 * the runtime harness.
 *
 * @param options - Agent and transpiler selection used for the export.
 * @returns Stored source, generated code, and transpiler metadata.
 */
export async function resolveTranspiledAgentCodeExport(options: {
    readonly agentName: string;
    readonly localServerUrl: string;
    readonly transpiler: BookTranspiler;
}): Promise<ResolvedTranspiledAgentCodeExport | null> {
    const { agentName, localServerUrl, transpiler } = options;
    const collection = await $provideAgentCollectionForServer();
    const agentSource = await collection.getAgentSource(agentName);

    if (!agentSource) {
        return null;
    }

    const baseAgentReferenceResolver = await $provideAgentReferenceResolver();
    const resolvedAgentContext = await resolveServerAgentContext({
        collection,
        agentIdentifier: agentName,
        localServerUrl,
        fallbackResolver: baseAgentReferenceResolver,
    });
    const resolvedAgentSource = resolvedAgentContext.resolvedAgentSource;

    if (!resolvedAgentSource) {
        return null;
    }

    const tools = await $provideExecutionToolsForServer();
    const transpiledCode = await transpiler.transpileBook(resolvedAgentSource, tools);
    const warnings = createTranspiledAgentExportWarnings(resolvedAgentSource);

    return {
        agentSource,
        transpiledCode,
        transpiler: {
            name: transpiler.name,
            title: transpiler.title,
        },
        warnings,
    };
}
