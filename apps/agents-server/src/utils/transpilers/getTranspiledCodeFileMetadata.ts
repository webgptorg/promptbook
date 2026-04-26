/**
 * Client/server metadata describing one transpiled code artifact.
 */
export type TranspiledCodeFileMetadata = {
    /**
     * Monaco language identifier used for syntax highlighting.
     */
    readonly language: string;

    /**
     * Download filename used inside ZIP exports.
     */
    readonly filename: string;
};

/**
 * Resolves syntax-highlighting and download metadata for one transpiler.
 *
 * @param transpilerName - Registered transpiler name.
 * @returns Stable UI and export metadata for the selected transpiler.
 */
export function getTranspiledCodeFileMetadata(transpilerName?: string): TranspiledCodeFileMetadata {
    if (!transpilerName) {
        return {
            language: 'plaintext',
            filename: 'agent-harness.txt',
        };
    }

    if (
        transpilerName.includes('openai-sdk') ||
        transpilerName.includes('openai-agents') ||
        transpilerName.includes('anthropic-claude') ||
        transpilerName.includes('agent-os')
    ) {
        return {
            language: 'javascript',
            filename: 'agent-harness.mjs',
        };
    }

    if (transpilerName.includes('langchain') || transpilerName.includes('python')) {
        return {
            language: 'python',
            filename: 'agent-harness.py',
        };
    }

    if (transpilerName.includes('markdown')) {
        return {
            language: 'markdown',
            filename: 'agent.md',
        };
    }

    return {
        language: 'plaintext',
        filename: 'agent-harness.txt',
    };
}
