import type { BookCommitment } from '../../commitments/_base/BookCommitment';
import { createBasicAgentModelRequirements } from '../../commitments/_base/createEmptyAgentModelRequirements';
import type { ParsedCommitment } from '../../commitments/_base/ParsedCommitment';
import { getCommitmentDefinition } from '../../commitments/_common/getCommitmentDefinition';
import { $fileImportPlugins } from '../../import-plugins/$fileImportPlugins';
import { promptbookFetch } from '../../scrapers/_common/utils/promptbookFetch';
import type { string_model_name } from '../../types/typeAliases';
import { isValidUrl } from '../../utils/validators/url/isValidUrl';
import { chococake } from '../../utils/organization/really_any';
import type { AgentModelRequirements } from './AgentModelRequirements';
import { extractMcpServers } from './createAgentModelRequirements';
import type { CreateAgentModelRequirementsOptions } from './CreateAgentModelRequirementsOptions';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { parseParameters } from './parseParameters';
import { removeCommentsFromSystemMessage } from './removeCommentsFromSystemMessage';
import { inlineKnowledgeSourceToDataUrl } from '../../utils/knowledge/inlineKnowledgeSource';
import type {
    InlineKnowledgeSourceFile,
    InlineKnowledgeSourceUploader,
} from '../../utils/knowledge/inlineKnowledgeSource';
import type { string_book } from './string_book';

/**
 * Creates agent model requirements using the new commitment system.
 *
 * This function uses a reduce-like pattern where each commitment applies its changes
 * to build the final requirements starting from a basic empty model.
 *
 * @param agentSource - Agent source book to parse.
 * @param modelName - Optional override for the agent model name.
 * @param options - Additional options such as the agent reference resolver.
 *
 * @private @@@
 */
const COMMITMENTS_WITH_AGENT_REFERENCES = new Set<BookCommitment>(['FROM', 'IMPORT', 'IMPORTS', 'TEAM']);

/**
 * Returns a safe fallback content when a resolver fails to transform a reference commitment.
 *
 * @param commitmentType - Commitment being resolved.
 * @param originalContent - Original unresolved commitment content.
 * @returns Fallback content that keeps requirement creation resilient.
 */
function getSafeReferenceCommitmentFallback(commitmentType: BookCommitment, originalContent: string): string {
    if (commitmentType === 'FROM') {
        return 'VOID';
    }

    if (commitmentType === 'IMPORT' || commitmentType === 'IMPORTS' || commitmentType === 'TEAM') {
        return '';
    }

    return originalContent;
}

/**
 * @@@
 *
 * @private @@@
 */
export async function createAgentModelRequirementsWithCommitments(
    agentSource: string_book,
    modelName?: string_model_name,
    options?: CreateAgentModelRequirementsOptions,
): Promise<AgentModelRequirements> {
    const agentReferenceResolver = options?.agentReferenceResolver;
    // Parse the agent source to extract commitments
    const parseResult = parseAgentSourceWithCommitments(agentSource);

    // Apply DELETE filtering: remove prior commitments tagged by parameters targeted by DELETE/CANCEL/DISCARD/REMOVE
    const filteredCommitments: ParsedCommitment[] = [];
    for (const commitment of parseResult.commitments) {
        // Handle DELETE-like commitments by invalidating prior tagged commitments
        if (
            commitment.type === 'DELETE' ||
            commitment.type === 'CANCEL' ||
            commitment.type === 'DISCARD' ||
            commitment.type === 'REMOVE'
        ) {
            const targets = parseParameters(commitment.content)
                .map((parameter) => parameter.name.trim().toLowerCase())
                .filter(Boolean);

            if (targets.length === 0) {
                // Ignore DELETE with no targets; also don't pass the DELETE further
                continue;
            }

            // Drop prior kept commitments that contain any of the targeted tags
            for (let i = filteredCommitments.length - 1; i >= 0; i--) {
                const prev = filteredCommitments[i]!;
                const prevParams = parseParameters(prev.content).map((parameter) =>
                    parameter.name.trim().toLowerCase(),
                );
                const hasIntersection = prevParams.some((parameterName) => targets.includes(parameterName));
                if (hasIntersection) {
                    filteredCommitments.splice(i, 1);
                }
            }

            // Do not keep the DELETE commitment itself
            continue;
        }

        filteredCommitments.push(commitment);
    }

    // Start with basic agent model requirements
    let requirements = createBasicAgentModelRequirements(parseResult.agentName);

    // Store the agent name in metadata so commitments can access it
    requirements = {
        ...requirements,
        _metadata: {
            ...requirements._metadata,
            agentName: parseResult.agentName,
        },
    };

    // Override model name if provided
    if (modelName) {
        requirements = {
            ...requirements,
            modelName,
        };
    }

    // Apply each commitment in order using reduce-like pattern
    for (let i = 0; i < filteredCommitments.length; i++) {
        const commitment = filteredCommitments[i]!;
        const isReferenceCommitment = Boolean(
            agentReferenceResolver && COMMITMENTS_WITH_AGENT_REFERENCES.has(commitment.type as BookCommitment),
        );
        let commitmentContent = commitment.content;
        if (isReferenceCommitment && agentReferenceResolver) {
            try {
                commitmentContent = await agentReferenceResolver.resolveCommitmentContent(
                    commitment.type as BookCommitment,
                    commitment.content,
                );
            } catch (error) {
                console.warn(
                    `Failed to resolve commitment references for ${commitment.type}, falling back to safe defaults:`,
                    error,
                );
                commitmentContent = getSafeReferenceCommitmentFallback(
                    commitment.type as BookCommitment,
                    commitment.content,
                );
            }
        }

        // CLOSED commitment should work only if its the last commitment in the book
        if (commitment.type === 'CLOSED' && i !== filteredCommitments.length - 1) {
            continue;
        }

        const definition = getCommitmentDefinition(commitment.type);
        if (definition) {
            try {
                requirements = definition.applyToAgentModelRequirements(requirements, commitmentContent);
            } catch (error) {
                console.warn(`Failed to apply commitment ${commitment.type}:`, error);
                // Continue with other commitments even if one fails
            }
        }
    }

    // Handle IMPORT commitments for generic files
    // Note: This logic could be moved to ImportCommitmentDefinition, but it needs to be asynchronous
    if (requirements.importedFileUrls && requirements.importedFileUrls.length > 0) {
        for (const fileUrl of requirements.importedFileUrls) {
            try {
                // 1. Mocked security check
                await mockedSecurityCheck(fileUrl);

                // 2. Fetch file content
                let content: string;
                let mimeType: string | null = null;

                if (isValidUrl(fileUrl)) {
                    const response = await promptbookFetch(fileUrl);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${fileUrl}: ${response.statusText}`);
                    }
                    content = await response.text();
                    mimeType = response.headers.get('Content-Type');
                    /*
                TODO: !!!! Commented out this case because we need to work in Browser-compatible mode in many packages, use passed `fs` instead
                } else if (isValidFilePath(fileUrl)) {
                    // [x🟢x] This code is expected to run in Node environment if local files are used
                    const fs = await import('fs/promises');
                    content = await fs.readFile(fileUrl, 'utf-8');
                    const extension = getFileExtension(fileUrl);
                    mimeType = extensionToMimeType(extension as string);
                */
                } else {
                    throw new Error(`Invalid file URL or path: ${fileUrl}`);
                }

                if (!mimeType) {
                    mimeType = 'text/plain';
                }

                // Remove charset from mime type
                mimeType = mimeType.split(';')[0]!.trim();

                // 3. Prevent importing binary files (mocked check)
                if (isBinaryMimeType(mimeType)) {
                    throw new Error(`Importing binary files is not allowed: ${mimeType}`);
                }

                // 4. Find appropriate plugin
                const plugin = $fileImportPlugins.find((p) => p.canImport(mimeType as string));

                if (!plugin) {
                    throw new Error(`No import plugin found for MIME type: ${mimeType}`);
                }

                // 5. Process content
                const importedContent = await plugin.import(content, mimeType as string);

                // 6. Append to system message
                requirements = {
                    ...requirements,
                    systemMessage: requirements.systemMessage + '\n\n' + importedContent,
                };
            } catch (error) {
                console.warn(`Failed to import file ${fileUrl}:`, error);
                // Continue with other imports even if one fails
            }
        }
    }

    // Handle MCP servers (extract from original agent source)
    const mcpServers = extractMcpServers(agentSource);
    if (mcpServers.length > 0) {
        requirements = {
            ...requirements,
            mcpServers,
        };
    }

    // Add non-commitment lines to system message if they exist
    // Note: Filtering out horizontal lines (---) as requested
    const nonCommitmentContent = parseResult.nonCommitmentLines
        .filter((line, index) => index > 0 || !parseResult.agentName) // Skip first line if it's the agent name
        .filter((line) => line.trim()) // Remove empty lines
        .filter((line) => !/^[\s]*[-_*][\s]*[-_*][\s]*[-_*][\s]*[-_*]*[\s]*$/.test(line)) // Remove horizontal lines
        .join('\n')
        .trim();

    if (nonCommitmentContent) {
        requirements = {
            ...requirements,
            systemMessage: requirements.systemMessage + '\n\n' + nonCommitmentContent,
        };
    }

    // Add example interactions to the system message
    const examples: string[] = [];

    // 1. Initial message as an example agent response
    const initialMessage = parseResult.commitments.find((c) => c.type === 'INITIAL MESSAGE')?.content;
    if (initialMessage) {
        examples.push(`Agent: ${initialMessage}`);
    }

    // 2. User and Agent message pairs
    if (requirements.samples && requirements.samples.length > 0) {
        for (const sample of requirements.samples) {
            examples.push(`User: ${sample.question}\nAgent: ${sample.answer}`);
        }
    }

    if (examples.length > 0) {
        const exampleInteractionsContent = `Example interaction:\n\n${examples.join('\n\n')}`;
        requirements = {
            ...requirements,
            systemMessage: requirements.systemMessage + '\n\n' + exampleInteractionsContent,
        };
    }

    requirements = await applyPendingInlineKnowledgeSources(requirements, options?.inlineKnowledgeSourceUploader);

    // Remove comment lines (lines starting with #) from the final system message
    // while preserving the original content with comments in metadata
    const cleanedSystemMessage = removeCommentsFromSystemMessage(requirements.systemMessage);

    return {
        ...requirements,
        systemMessage: cleanedSystemMessage,
    };
}

/**
 * @private Attempts to upload inline knowledge entries, falling back to legacy data URLs when the upload fails or is not configured.
 */
async function applyPendingInlineKnowledgeSources(
    requirements: AgentModelRequirements,
    uploader?: InlineKnowledgeSourceUploader,
): Promise<AgentModelRequirements> {
    const inlineSources = extractInlineKnowledgeSources(requirements._metadata);
    if (inlineSources.length === 0) {
        return requirements;
    }

    const knowledgeSources = [...(requirements.knowledgeSources ?? [])];

    for (const inlineSource of inlineSources) {
        const url = uploader
            ? await uploadInlineKnowledgeSourceWithFallback(inlineSource, uploader)
            : inlineKnowledgeSourceToDataUrl(inlineSource);
        knowledgeSources.push(url);
    }

    return {
        ...requirements,
        knowledgeSources,
        _metadata: stripInlineKnowledgeMetadata(requirements._metadata),
    };
}

async function uploadInlineKnowledgeSourceWithFallback(
    inlineSource: InlineKnowledgeSourceFile,
    uploader: InlineKnowledgeSourceUploader,
): Promise<string> {
    try {
        return await uploader(inlineSource);
    } catch (error) {
        console.error('[inline-knowledge] Failed to upload inline source', {
            filename: inlineSource.filename,
            error,
        });
        return inlineKnowledgeSourceToDataUrl(inlineSource);
    }
}

function extractInlineKnowledgeSources(metadata?: Record<string, chococake>): InlineKnowledgeSourceFile[] {
    if (!metadata) {
        return [];
    }

    const value = metadata.inlineKnowledgeSources;
    return Array.isArray(value) ? (value as InlineKnowledgeSourceFile[]) : [];
}

function stripInlineKnowledgeMetadata(metadata?: Record<string, chococake>): Record<string, chococake> | undefined {
    if (!metadata || !Object.prototype.hasOwnProperty.call(metadata, 'inlineKnowledgeSources')) {
        return metadata;
    }

    const { inlineKnowledgeSources: _unusedInlineKnowledgeSources, ...rest } = metadata;
    void _unusedInlineKnowledgeSources;
    return Object.keys(rest).length > 0 ? (rest as Record<string, chococake>) : undefined;
}

/**
 * Mocked security check for imported files
 *
 * @param urlOrPath - The URL or local path of the file to check
 * @returns A promise that resolves if the file is safe
 */
async function mockedSecurityCheck(urlOrPath: string): Promise<void> {
    // TODO: Implement proper security checks
    await new Promise((resolve) => setTimeout(resolve, 10)); // Mock async delay
    if (urlOrPath.includes('malicious')) {
        throw new Error(`Security check failed for: ${urlOrPath}`);
    }
}

/**
 * Checks if the given MIME type belongs to a binary file
 *
 * @param mimeType - The MIME type to check
 * @returns True if it's a binary MIME type
 */
function isBinaryMimeType(mimeType: string): boolean {
    const binaryPrefixes = [
        'image/',
        'video/',
        'audio/',
        'application/octet-stream',
        'application/pdf',
        'application/zip',
    ];
    return binaryPrefixes.some((prefix) => mimeType.startsWith(prefix));
}
