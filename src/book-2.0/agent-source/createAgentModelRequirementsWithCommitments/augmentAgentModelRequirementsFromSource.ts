import { spaceTrim } from 'spacetrim';
import { $fileImportPlugins } from '../../../import-plugins/$fileImportPlugins';
import { promptbookFetch } from '../../../scrapers/_common/utils/promptbookFetch';
import { isValidUrl } from '../../../utils/validators/url/isValidUrl';
import type { AgentModelRequirements } from '../AgentModelRequirements';
import { extractMcpServers } from '../createAgentModelRequirements';
import type { string_book } from '../string_book';
import type { ParsedAgentSourceWithCommitments } from './ParsedAgentSourceWithCommitments';

/**
 * Regex pattern matching markdown horizontal lines that should not be copied into the final system message.
 *
 * @private internal constant of `augmentAgentModelRequirementsFromSource`
 */
const HORIZONTAL_LINE_PATTERN = /^[\s]*[-_*][\s]*[-_*][\s]*[-_*][\s]*[-_*]*[\s]*$/;

/**
 * MIME type prefixes treated as binary and therefore not eligible for text import plugins.
 *
 * @private internal constant of `augmentAgentModelRequirementsFromSource`
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
 * Adds source-derived sections after commitments have been applied.
 *
 * @param requirements - Requirements after commitment application and USE aggregation.
 * @param parseResult - Parsed source used to recover non-commitment prose and examples.
 * @param agentSource - Original source used to recover MCP server declarations.
 * @returns Requirements with source-derived sections appended.
 *
 * @private function of `createAgentModelRequirementsWithCommitments`
 */
export async function augmentAgentModelRequirementsFromSource(
    requirements: AgentModelRequirements,
    parseResult: ParsedAgentSourceWithCommitments,
    agentSource: string_book,
): Promise<AgentModelRequirements> {
    requirements = await importReferencedFiles(requirements);
    requirements = appendMcpServers(requirements, agentSource);
    requirements = appendNonCommitmentContent(requirements, parseResult);

    return appendExampleInteractions(requirements, parseResult);
}

/**
 * Imports text files referenced by IMPORT commitments and appends their transformed content to the system message.
 *
 * @param requirements - Requirements possibly containing `importedFileUrls`.
 * @returns Requirements with imported file content appended to the system message.
 *
 * @private internal utility of `augmentAgentModelRequirementsFromSource`
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
 * @private internal utility of `augmentAgentModelRequirementsFromSource`
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
 * @private internal utility of `augmentAgentModelRequirementsFromSource`
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
 * @private internal utility of `augmentAgentModelRequirementsFromSource`
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

    return spaceTrim(
        (block) => `
            ## Sample of communication with the agent:

            ${block(examples.join('\n\n'))}
        `,
    );
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
        examples.push(`**Agent:**\n${initialMessage}`);
    }

    if (samples && samples.length > 0) {
        for (const sample of samples) {
            examples.push(`**User:** ${sample.question}\n\n**Agent:**\n${sample.answer}`);
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
 * @private internal utility of `augmentAgentModelRequirementsFromSource`
 */
function appendSystemMessageSection(requirements: AgentModelRequirements, section: string): AgentModelRequirements {
    return {
        ...requirements,
        systemMessage: spaceTrim(
            (block) => `
                ${block(requirements.systemMessage)}

                ${block(section)}
            `,
        ),
    };
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
