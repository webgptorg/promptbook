import type { BookCommitment } from '../../commitments/_base/BookCommitment';
import { createBasicAgentModelRequirements } from '../../commitments/_base/createEmptyAgentModelRequirements';
import type { ParsedCommitment } from '../../commitments/_base/ParsedCommitment';
import { getCommitmentDefinition } from '../../commitments/_common/getCommitmentDefinition';
import { aggregateUseCommitmentSystemMessages } from '../../commitments/USE/aggregateUseCommitmentSystemMessages';
import { $fileImportPlugins } from '../../import-plugins/$fileImportPlugins';
import { promptbookFetch } from '../../scrapers/_common/utils/promptbookFetch';
import type { string_model_name } from '../../types/typeAliases';
import { inlineKnowledgeSourceToDataUrl } from '../../utils/knowledge/inlineKnowledgeSource';
import type {
    InlineKnowledgeSourceFile,
    InlineKnowledgeSourceUploader,
} from '../../utils/knowledge/inlineKnowledgeSource';
import { chococake } from '../../utils/organization/really_any';
import { isValidUrl } from '../../utils/validators/url/isValidUrl';
import type { AgentModelRequirements } from './AgentModelRequirements';
import type { CreateAgentModelRequirementsOptions } from './CreateAgentModelRequirementsOptions';
import { extractMcpServers } from './createAgentModelRequirements';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { parseParameters } from './parseParameters';
import { parseTeamCommitmentContent } from './parseTeamCommitment';
import { removeCommentsFromSystemMessage } from './removeCommentsFromSystemMessage';
import type { TeammateProfile } from './TeammateProfileResolver';
import type { string_book } from './string_book';

/**
 * Parsed agent source data produced by `parseAgentSourceWithCommitments`.
 *
 * @private internal type of `createAgentModelRequirementsWithCommitments`
 */
type ParsedAgentSourceWithCommitments = ReturnType<typeof parseAgentSourceWithCommitments>;

/**
 * Commitment types whose content may contain compact agent references that must be resolved before applying the commitment.
 *
 * @private internal constant of `createAgentModelRequirementsWithCommitments`
 */
const COMMITMENTS_WITH_AGENT_REFERENCES = new Set<BookCommitment>(['FROM', 'IMPORT', 'IMPORTS', 'TEAM']);

/**
 * DELETE-like commitment types that invalidate earlier tagged commitments.
 *
 * @private internal constant of `createAgentModelRequirementsWithCommitments`
 */
const DELETE_COMMITMENT_TYPES = new Set<BookCommitment>(['DELETE', 'CANCEL', 'DISCARD', 'REMOVE']);

/**
 * Regex pattern matching markdown horizontal lines that should not be copied into the final system message.
 *
 * @private internal constant of `createAgentModelRequirementsWithCommitments`
 */
const HORIZONTAL_LINE_PATTERN = /^[\s]*[-_*][\s]*[-_*][\s]*[-_*][\s]*[-_*]*[\s]*$/;

/**
 * MIME type prefixes treated as binary and therefore not eligible for text import plugins.
 *
 * @private internal constant of `createAgentModelRequirementsWithCommitments`
 */
const BINARY_MIME_TYPE_PREFIXES = [
    'image/',
    'video/',
    'audio/',
    'application/octet-stream',
    'application/pdf',
    'application/zip',
];

/**
 * Returns a safe fallback content when a resolver fails to transform a reference commitment.
 *
 * @param commitmentType - Commitment being resolved.
 * @param originalContent - Original unresolved commitment content.
 * @returns Fallback content that keeps requirement creation resilient.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
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
 * Creates agent model requirements by parsing commitments, applying them in source order,
 * and finalizing derived sections such as imports, example interactions, and inline knowledge uploads.
 *
 * @param agentSource - Agent source book to parse.
 * @param modelName - Optional override for the agent model name.
 * @param options - Additional options such as reference and teammate resolvers.
 * @returns Fully prepared model requirements for the parsed agent source.
 *
 * @private internal utility of `createAgentModelRequirements`
 */
export async function createAgentModelRequirementsWithCommitments(
    agentSource: string_book,
    modelName?: string_model_name,
    options?: CreateAgentModelRequirementsOptions,
): Promise<AgentModelRequirements> {
    const parseResult = parseAgentSourceWithCommitments(agentSource);
    const filteredCommitments = filterDeletedCommitments(parseResult.commitments);

    let requirements = createInitialAgentModelRequirements(parseResult.agentName, modelName);
    requirements = await applyCommitmentsToRequirements(requirements, filteredCommitments, options);
    requirements = aggregateUseCommitmentSystemMessages(requirements, filteredCommitments);
    requirements = await importReferencedFiles(requirements);
    requirements = appendMcpServers(requirements, agentSource);
    requirements = appendNonCommitmentContent(requirements, parseResult);
    requirements = appendExampleInteractions(requirements, parseResult);
    requirements = await applyPendingInlineKnowledgeSources(requirements, options?.inlineKnowledgeSourceUploader);

    return finalizeRequirements(requirements);
}

/**
 * Creates the initial requirements object with the parsed agent name stored in metadata and an optional model override.
 *
 * @param agentName - Parsed agent name from the source prelude.
 * @param modelName - Optional explicit model name override.
 * @returns Initial requirements before any commitment is applied.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
function createInitialAgentModelRequirements(
    agentName: string | null,
    modelName?: string_model_name,
): AgentModelRequirements {
    const initialRequirements = createBasicAgentModelRequirements(agentName);
    const requirementsWithMetadata: AgentModelRequirements = {
        ...initialRequirements,
        _metadata: {
            ...initialRequirements._metadata,
            agentName,
        },
    };

    if (!modelName) {
        return requirementsWithMetadata;
    }

    return {
        ...requirementsWithMetadata,
        modelName,
    };
}

/**
 * Applies DELETE-like invalidation commitments and returns only commitments that should continue through the pipeline.
 *
 * @param commitments - Parsed commitments in original source order.
 * @returns Filtered commitments with earlier deleted items removed.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
function filterDeletedCommitments(commitments: ReadonlyArray<ParsedCommitment>): ParsedCommitment[] {
    const filteredCommitments: ParsedCommitment[] = [];

    for (const commitment of commitments) {
        if (!isDeleteCommitmentType(commitment.type)) {
            filteredCommitments.push(commitment);
            continue;
        }

        const targetParameterNames = getCommitmentParameterNames(commitment.content);
        if (targetParameterNames.length === 0) {
            continue;
        }

        for (let index = filteredCommitments.length - 1; index >= 0; index--) {
            const previousCommitment = filteredCommitments[index]!;
            const previousParameterNames = getCommitmentParameterNames(previousCommitment.content);
            const isTargeted = previousParameterNames.some((parameterName) =>
                targetParameterNames.includes(parameterName),
            );

            if (isTargeted) {
                filteredCommitments.splice(index, 1);
            }
        }
    }

    return filteredCommitments;
}

/**
 * Checks whether a commitment type behaves like DELETE and therefore invalidates earlier tagged commitments.
 *
 * @param commitmentType - Commitment type to check.
 * @returns `true` when the commitment removes prior tagged commitments.
 *
 * @private internal utility of `filterDeletedCommitments`
 */
function isDeleteCommitmentType(commitmentType: ParsedCommitment['type']): boolean {
    return DELETE_COMMITMENT_TYPES.has(commitmentType);
}

/**
 * Extracts normalized parameter names used for DELETE-like invalidation matching.
 *
 * @param content - Commitment content to parse.
 * @returns Lower-cased non-empty parameter names.
 *
 * @private internal utility of `filterDeletedCommitments`
 */
function getCommitmentParameterNames(content: string): string[] {
    return parseParameters(content)
        .map((parameter) => parameter.name.trim().toLowerCase())
        .filter(Boolean);
}

/**
 * Applies parsed commitments one by one while keeping the per-commitment steps focused and easy to follow.
 *
 * @param requirements - Current requirements snapshot.
 * @param commitments - Commitments already filtered for DELETE-like invalidations.
 * @param options - Optional reference and teammate resolvers.
 * @returns Requirements after all applicable commitments are processed.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
async function applyCommitmentsToRequirements(
    requirements: AgentModelRequirements,
    commitments: ReadonlyArray<ParsedCommitment>,
    options?: CreateAgentModelRequirementsOptions,
): Promise<AgentModelRequirements> {
    for (const [index, commitment] of commitments.entries()) {
        if (shouldSkipCommitmentApplication(commitment, index, commitments.length)) {
            continue;
        }

        const commitmentContent = await resolveCommitmentContent(commitment, options?.agentReferenceResolver);
        requirements = await preResolveTeammateProfilesForTeamCommitment(
            requirements,
            commitment,
            commitmentContent,
            options,
        );
        requirements = applyCommitmentDefinitionSafely(requirements, commitment, commitmentContent);
    }

    return requirements;
}

/**
 * Resolves compact agent references for commitment types that support them.
 *
 * @param commitment - Commitment currently being applied.
 * @param agentReferenceResolver - Optional resolver for compact agent references.
 * @returns Original or resolved commitment content.
 *
 * @private internal utility of `applyCommitmentsToRequirements`
 */
async function resolveCommitmentContent(
    commitment: ParsedCommitment,
    agentReferenceResolver?: CreateAgentModelRequirementsOptions['agentReferenceResolver'],
): Promise<string> {
    if (!agentReferenceResolver || !isAgentReferenceCommitment(commitment.type)) {
        return commitment.content;
    }

    try {
        return await agentReferenceResolver.resolveCommitmentContent(commitment.type, commitment.content);
    } catch (error) {
        console.warn(
            `Failed to resolve commitment references for ${commitment.type}, falling back to safe defaults:`,
            error,
        );
        return getSafeReferenceCommitmentFallback(commitment.type, commitment.content);
    }
}

/**
 * Checks whether the commitment content may need agent-reference resolution before application.
 *
 * @param commitmentType - Commitment type to check.
 * @returns `true` when the commitment can contain compact agent references.
 *
 * @private internal utility of `resolveCommitmentContent`
 */
function isAgentReferenceCommitment(commitmentType: ParsedCommitment['type']): boolean {
    return COMMITMENTS_WITH_AGENT_REFERENCES.has(commitmentType);
}

/**
 * Determines whether a commitment should be skipped before resolution or application.
 *
 * @param commitment - Commitment under consideration.
 * @param commitmentIndex - Zero-based position among filtered commitments.
 * @param commitmentCount - Total number of filtered commitments.
 * @returns `true` when the commitment should not be applied.
 *
 * @private internal utility of `applyCommitmentsToRequirements`
 */
function shouldSkipCommitmentApplication(
    commitment: ParsedCommitment,
    commitmentIndex: number,
    commitmentCount: number,
): boolean {
    return commitment.type === 'CLOSED' && commitmentIndex !== commitmentCount - 1;
}

/**
 * Pre-resolves teammate profiles for TEAM commitments so the TEAM commitment definition can reuse richer metadata.
 *
 * @param requirements - Current requirements snapshot.
 * @param commitment - Commitment currently being prepared.
 * @param commitmentContent - Already resolved TEAM commitment content.
 * @param options - Optional teammate profile resolvers.
 * @returns Requirements with pre-resolved teammate profiles stored in metadata when possible.
 *
 * @private internal utility of `applyCommitmentsToRequirements`
 */
async function preResolveTeammateProfilesForTeamCommitment(
    requirements: AgentModelRequirements,
    commitment: ParsedCommitment,
    commitmentContent: string,
    options?: CreateAgentModelRequirementsOptions,
): Promise<AgentModelRequirements> {
    const profileResolver = options?.teammateProfileResolver ?? options?.agentReferenceResolver;
    if (commitment.type !== 'TEAM' || !profileResolver?.resolveTeammateProfile) {
        return requirements;
    }

    try {
        const parsedTeammates = parseTeamCommitmentContent(commitmentContent, { strict: false });
        const preResolvedTeammateProfiles = clonePreResolvedTeammateProfiles(requirements._metadata);

        for (const teammate of parsedTeammates) {
            if (preResolvedTeammateProfiles[teammate.url]) {
                continue;
            }

            const profile = await profileResolver.resolveTeammateProfile(teammate.url);
            if (profile) {
                preResolvedTeammateProfiles[teammate.url] = profile;
            }
        }

        return {
            ...requirements,
            _metadata: {
                ...requirements._metadata,
                preResolvedTeammateProfiles,
            },
        };
    } catch (error) {
        console.warn('Failed to pre-resolve teammate profiles for TEAM commitment:', error);
        return requirements;
    }
}

/**
 * Clones the metadata bucket used to cache teammate profiles resolved ahead of TEAM commitment application.
 *
 * @param metadata - Current requirements metadata.
 * @returns Mutable copy of the cached teammate profile map.
 *
 * @private internal utility of `preResolveTeammateProfilesForTeamCommitment`
 */
function clonePreResolvedTeammateProfiles(
    metadata?: Record<string, chococake>,
): Record<string, TeammateProfile> {
    return {
        ...((metadata?.preResolvedTeammateProfiles as Record<string, TeammateProfile> | undefined) ?? {}),
    };
}

/**
 * Applies the registered commitment definition while isolating the failure handling from the main loop.
 *
 * @param requirements - Current requirements snapshot.
 * @param commitment - Commitment whose definition should be applied.
 * @param commitmentContent - Final content passed into the definition.
 * @returns Updated requirements, or the original requirements when the commitment fails.
 *
 * @private internal utility of `applyCommitmentsToRequirements`
 */
function applyCommitmentDefinitionSafely(
    requirements: AgentModelRequirements,
    commitment: ParsedCommitment,
    commitmentContent: string,
): AgentModelRequirements {
    const definition = getCommitmentDefinition(commitment.type);
    if (!definition) {
        return requirements;
    }

    try {
        return definition.applyToAgentModelRequirements(requirements, commitmentContent);
    } catch (error) {
        console.warn(`Failed to apply commitment ${commitment.type}:`, error);
        return requirements;
    }
}

/**
 * Imports text files referenced by IMPORT commitments and appends their transformed content to the system message.
 *
 * @param requirements - Requirements possibly containing `importedFileUrls`.
 * @returns Requirements with imported file content appended to the system message.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
async function importReferencedFiles(requirements: AgentModelRequirements): Promise<AgentModelRequirements> {
    const importedFileUrls = requirements.importedFileUrls;
    if (!importedFileUrls || importedFileUrls.length === 0) {
        return requirements;
    }

    for (const fileUrl of importedFileUrls) {
        try {
            const importedContent = await createImportedFileSystemMessage(fileUrl);
            requirements = appendSystemMessageSection(requirements, importedContent);
        } catch (error) {
            console.warn(`Failed to import file ${fileUrl}:`, error);
        }
    }

    return requirements;
}

/**
 * Loads, validates, and transforms one imported file into a system-message block.
 *
 * @param fileUrl - Remote URL or local path declared in an IMPORT commitment.
 * @returns Imported text ready to append to the system message.
 *
 * @private internal utility of `importReferencedFiles`
 */
async function createImportedFileSystemMessage(fileUrl: string): Promise<string> {
    await mockedSecurityCheck(fileUrl);

    const { content, mimeType } = await readImportedFile(fileUrl);
    if (isBinaryMimeType(mimeType)) {
        throw new Error(`Importing binary files is not allowed: ${mimeType}`);
    }

    const plugin = $fileImportPlugins.find((fileImportPlugin) => fileImportPlugin.canImport(mimeType));
    if (!plugin) {
        throw new Error(`No import plugin found for MIME type: ${mimeType}`);
    }

    return plugin.import(content, mimeType);
}

/**
 * Reads one imported file and normalizes the MIME type expected by file import plugins.
 *
 * @param fileUrl - Remote URL or local path declared in an IMPORT commitment.
 * @returns Plain-text content together with a normalized MIME type.
 *
 * @private internal utility of `createImportedFileSystemMessage`
 */
async function readImportedFile(fileUrl: string): Promise<{ content: string; mimeType: string }> {
    if (isValidUrl(fileUrl)) {
        const response = await promptbookFetch(fileUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${fileUrl}: ${response.statusText}`);
        }

        return {
            content: await response.text(),
            mimeType: normalizeImportedMimeType(response.headers.get('Content-Type')),
        };
    }

    /*
    TODO: !!!! Commented out this case because we need to work in Browser-compatible mode in many packages, use passed `fs` instead
    } else if (isValidFilePath(fileUrl)) {
        // [x🟢x] This code is expected to run in Node environment if local files are used
        const fs = await import('fs/promises');
        content = await fs.readFile(fileUrl, 'utf-8');
        const extension = getFileExtension(fileUrl);
        mimeType = extensionToMimeType(extension as string);
    */

    throw new Error(`Invalid file URL or path: ${fileUrl}`);
}

/**
 * Normalizes MIME types returned by fetch so plugin lookup works on bare MIME values without charset suffixes.
 *
 * @param mimeType - Raw response MIME type header.
 * @returns Normalized MIME type fallbacking to `text/plain`.
 *
 * @private internal utility of `readImportedFile`
 */
function normalizeImportedMimeType(mimeType: string | null): string {
    return (mimeType || 'text/plain').split(';')[0]!.trim();
}

/**
 * Appends extracted MCP server identifiers from the original source.
 *
 * @param requirements - Current requirements snapshot.
 * @param agentSource - Original agent source used for MCP extraction.
 * @returns Requirements with `mcpServers` set when MCP commitments are present.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
function appendMcpServers(requirements: AgentModelRequirements, agentSource: string_book): AgentModelRequirements {
    const mcpServers = extractMcpServers(agentSource);
    if (mcpServers.length === 0) {
        return requirements;
    }

    return {
        ...requirements,
        mcpServers,
    };
}

/**
 * Appends non-commitment prose from the source after filtering out blank lines and markdown horizontal rules.
 *
 * @param requirements - Current requirements snapshot.
 * @param parseResult - Parsed source including non-commitment lines.
 * @returns Requirements with the remaining prose appended to the system message.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
function appendNonCommitmentContent(
    requirements: AgentModelRequirements,
    parseResult: ParsedAgentSourceWithCommitments,
): AgentModelRequirements {
    const nonCommitmentContent = getNonCommitmentContent(parseResult);
    if (!nonCommitmentContent) {
        return requirements;
    }

    return appendSystemMessageSection(requirements, nonCommitmentContent);
}

/**
 * Collects plain-text lines that were not parsed as commitments and should still become part of the final system message.
 *
 * @param parseResult - Parsed source including non-commitment lines.
 * @returns Joined non-commitment content or an empty string when there is nothing to append.
 *
 * @private internal utility of `appendNonCommitmentContent`
 */
function getNonCommitmentContent(parseResult: ParsedAgentSourceWithCommitments): string {
    return parseResult.nonCommitmentLines
        .filter((line, index) => index > 0 || !parseResult.agentName)
        .filter((line) => line.trim())
        .filter((line) => !isHorizontalLine(line))
        .join('\n')
        .trim();
}

/**
 * Checks whether a line is a markdown horizontal separator.
 *
 * @param line - Source line to inspect.
 * @returns `true` when the line is a thematic break.
 *
 * @private internal utility of `getNonCommitmentContent`
 */
function isHorizontalLine(line: string): boolean {
    return HORIZONTAL_LINE_PATTERN.test(line);
}

/**
 * Appends example interactions assembled from INITIAL MESSAGE and USER/AGENT sample commitments.
 *
 * @param requirements - Current requirements snapshot.
 * @param parseResult - Parsed source used to recover initial message content.
 * @returns Requirements with the example interaction block appended when examples exist.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
function appendExampleInteractions(
    requirements: AgentModelRequirements,
    parseResult: ParsedAgentSourceWithCommitments,
): AgentModelRequirements {
    const exampleInteractionsContent = createExampleInteractionsContent(parseResult, requirements.samples);
    if (!exampleInteractionsContent) {
        return requirements;
    }

    return appendSystemMessageSection(requirements, exampleInteractionsContent);
}

/**
 * Creates the formatted example-interaction section appended to the final system message.
 *
 * @param parseResult - Parsed source used to recover the initial message commitment.
 * @param samples - Parsed USER/AGENT sample pairs already stored on requirements.
 * @returns Formatted example interaction block or `null` when no examples exist.
 *
 * @private internal utility of `appendExampleInteractions`
 */
function createExampleInteractionsContent(
    parseResult: ParsedAgentSourceWithCommitments,
    samples: AgentModelRequirements['samples'],
): string | null {
    const examples = collectExampleInteractionLines(parseResult, samples);
    if (examples.length === 0) {
        return null;
    }

    return `Example interaction:\n\n${examples.join('\n\n')}`;
}

/**
 * Collects the individual lines used in the example interaction section.
 *
 * @param parseResult - Parsed source used to recover the initial message commitment.
 * @param samples - Parsed USER/AGENT sample pairs already stored on requirements.
 * @returns Individual example interaction snippets in output order.
 *
 * @private internal utility of `createExampleInteractionsContent`
 */
function collectExampleInteractionLines(
    parseResult: ParsedAgentSourceWithCommitments,
    samples: AgentModelRequirements['samples'],
): string[] {
    const examples: string[] = [];
    const initialMessage = parseResult.commitments.find((commitment) => commitment.type === 'INITIAL MESSAGE')?.content;

    if (initialMessage) {
        examples.push(`Agent: ${initialMessage}`);
    }

    if (samples && samples.length > 0) {
        for (const sample of samples) {
            examples.push(`User: ${sample.question}\nAgent: ${sample.answer}`);
        }
    }

    return examples;
}

/**
 * Appends a single system-message section using the same blank-line separation used throughout the original implementation.
 *
 * @param requirements - Current requirements snapshot.
 * @param section - Section content to append.
 * @returns Requirements with the additional system-message block appended.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
function appendSystemMessageSection(
    requirements: AgentModelRequirements,
    section: string,
): AgentModelRequirements {
    return {
        ...requirements,
        systemMessage: requirements.systemMessage + '\n\n' + section,
    };
}

/**
 * Performs the final system-message cleanup pass after all other augmentation steps are complete.
 *
 * @param requirements - Fully built requirements before final cleanup.
 * @returns Requirements with comment lines removed from the final system message.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
function finalizeRequirements(requirements: AgentModelRequirements): AgentModelRequirements {
    return {
        ...requirements,
        systemMessage: removeCommentsFromSystemMessage(requirements.systemMessage),
    };
}

/**
 * Attempts to upload inline knowledge entries, falling back to legacy data URLs when the upload fails or is not configured.
 *
 * @param requirements - Current requirements snapshot.
 * @param uploader - Optional uploader for inline knowledge files.
 * @returns Requirements with inline knowledge converted into upload URLs or data URLs.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
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

/**
 * Uploads one inline knowledge source and falls back to a data URL when the upload fails.
 *
 * @param inlineSource - Inline knowledge file waiting for upload.
 * @param uploader - Upload implementation provided by the caller.
 * @returns Uploaded knowledge URL or a legacy data URL fallback.
 *
 * @private internal utility of `applyPendingInlineKnowledgeSources`
 */
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

/**
 * Extracts inline knowledge sources cached in commitment metadata.
 *
 * @param metadata - Current requirements metadata.
 * @returns Inline knowledge files collected during commitment application.
 *
 * @private internal utility of `applyPendingInlineKnowledgeSources`
 */
function extractInlineKnowledgeSources(metadata?: Record<string, chococake>): InlineKnowledgeSourceFile[] {
    if (!metadata) {
        return [];
    }

    const value = metadata.inlineKnowledgeSources;
    return Array.isArray(value) ? (value as InlineKnowledgeSourceFile[]) : [];
}

/**
 * Removes inline-knowledge staging metadata after it has been materialized into final knowledge source URLs.
 *
 * @param metadata - Current requirements metadata.
 * @returns Metadata without the temporary inline knowledge staging field.
 *
 * @private internal utility of `applyPendingInlineKnowledgeSources`
 */
function stripInlineKnowledgeMetadata(metadata?: Record<string, chococake>): Record<string, chococake> | undefined {
    if (!metadata || !Object.prototype.hasOwnProperty.call(metadata, 'inlineKnowledgeSources')) {
        return metadata;
    }

    const { inlineKnowledgeSources: _unusedInlineKnowledgeSources, ...rest } = metadata;
    void _unusedInlineKnowledgeSources;
    return Object.keys(rest).length > 0 ? (rest as Record<string, chococake>) : undefined;
}

/**
 * Mocked security check for imported files.
 *
 * @param urlOrPath - The URL or local path of the file to check.
 * @returns A promise that resolves if the file is considered safe.
 *
 * @private internal utility of `createImportedFileSystemMessage`
 */
async function mockedSecurityCheck(urlOrPath: string): Promise<void> {
    // TODO: Implement proper security checks
    await new Promise((resolve) => setTimeout(resolve, 10));

    if (urlOrPath.includes('malicious')) {
        throw new Error(`Security check failed for: ${urlOrPath}`);
    }
}

/**
 * Checks whether the given MIME type belongs to a binary file.
 *
 * @param mimeType - The MIME type to check.
 * @returns `true` when the MIME type is treated as binary.
 *
 * @private internal utility of `createImportedFileSystemMessage`
 */
function isBinaryMimeType(mimeType: string): boolean {
    return BINARY_MIME_TYPE_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}
