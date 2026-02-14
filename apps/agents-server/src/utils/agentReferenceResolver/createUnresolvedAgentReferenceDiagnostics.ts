import type { AgentReferenceResolver } from '../../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import type { BookCommitment } from '../../../../../src/commitments/_base/BookCommitment';
import type { ParsedCommitment } from '../../../../../src/commitments/_base/ParsedCommitment';
import { consumeAgentReferenceResolutionIssues } from './AgentReferenceResolutionIssue';
import { extractAgentReferenceTokens } from './extractAgentReferenceTokens';

/**
 * Monaco-compatible diagnostic payload for unresolved compact agent references.
 */
export type AgentReferenceDiagnostic = {
    /**
     * 1-based start line in agent source.
     */
    readonly startLineNumber: number;

    /**
     * 1-based start column in agent source.
     */
    readonly startColumn: number;

    /**
     * 1-based end line in agent source.
     */
    readonly endLineNumber: number;

    /**
     * 1-based end column in agent source (exclusive).
     */
    readonly endColumn: number;

    /**
     * Human-readable validation message.
     */
    readonly message: string;

    /**
     * Optional source label shown by Monaco.
     */
    readonly source?: string;
};

export type MissingTeamReference = {
    readonly reference: string;
    readonly token: string;
};

export type AgentReferenceDiagnosticsResult = {
    readonly diagnostics: Array<AgentReferenceDiagnostic>;
    readonly missingTeamReferences: Array<MissingTeamReference>;
};

/**
 * Internal token location used to map unresolved references into source ranges.
 */
type AgentReferenceTokenLocation = {
    readonly commitmentType: BookCommitment;
    readonly token: string;
    readonly reference: string;
    readonly startLineNumber: number;
    readonly startColumn: number;
    readonly endLineNumber: number;
    readonly endColumn: number;
};

/**
 * Regex pattern to match horizontal lines (markdown thematic breaks).
 */
const HORIZONTAL_LINE_PATTERN = /^[\s]*[-_*][\s]*[-_*][\s]*[-_*][\s]*[-_*]*[\s]*$/;

/**
 * Commitment types that can reference other agents.
 */
const AGENT_REFERENCE_COMMITMENT_TYPES: ReadonlySet<BookCommitment> = new Set<BookCommitment>([
    'FROM',
    'IMPORT',
    'IMPORTS',
    'TEAM',
]);

/**
 * Monaco source name used for unresolved compact-reference markers.
 */
const AGENT_REFERENCE_DIAGNOSTIC_SOURCE = 'agent-reference';

/**
 * Creates unresolved-reference diagnostics for FROM/IMPORT/TEAM compact references.
 *
 * @param agentSource - Agent source currently edited in BookEditor.
 * @param agentReferenceResolver - Resolver configured for local/federated agent lookup.
 * @returns Diagnostics with precise ranges for unresolved compact references.
 */
export async function createUnresolvedAgentReferenceDiagnostics(
    agentSource: string_book,
    agentReferenceResolver: AgentReferenceResolver,
): Promise<AgentReferenceDiagnosticsResult> {
    const tokenLocations = collectAgentReferenceTokenLocations(agentSource);
    if (tokenLocations.length === 0) {
        consumeAgentReferenceResolutionIssues(agentReferenceResolver);
        return {
            diagnostics: [],
            missingTeamReferences: [],
        };
    }

    consumeAgentReferenceResolutionIssues(agentReferenceResolver);

    const firstLocationByKey = new Map<string, AgentReferenceTokenLocation>();
    for (const location of tokenLocations) {
        const locationKey = createLocationKey(location);
        if (!firstLocationByKey.has(locationKey)) {
            firstLocationByKey.set(locationKey, location);
        }
    }

    const unresolvedKeys = new Set<string>();

    for (const [locationKey, location] of firstLocationByKey.entries()) {
        if (await isCompactReferenceUnresolved(location, agentReferenceResolver)) {
            unresolvedKeys.add(locationKey);
        }
    }

    consumeAgentReferenceResolutionIssues(agentReferenceResolver);

    if (unresolvedKeys.size === 0) {
        return {
            diagnostics: [],
            missingTeamReferences: [],
        };
    }

    const diagnostics: Array<AgentReferenceDiagnostic> = [];
    const missingTeamReferenceByNormalized = new Map<string, MissingTeamReference>();

    for (const location of tokenLocations) {
        const locationKey = createLocationKey(location);
        if (!unresolvedKeys.has(locationKey)) {
            continue;
        }

        diagnostics.push({
            startLineNumber: location.startLineNumber,
            startColumn: location.startColumn,
            endLineNumber: location.endLineNumber,
            endColumn: location.endColumn,
            message: createUnresolvedReferenceMessage(location),
            source: AGENT_REFERENCE_DIAGNOSTIC_SOURCE,
        });

        if (location.commitmentType === 'TEAM') {
            const trimmedReference = location.reference.trim();
            if (trimmedReference) {
                const normalizedReference = trimmedReference.toLowerCase();
                if (!missingTeamReferenceByNormalized.has(normalizedReference)) {
                    missingTeamReferenceByNormalized.set(normalizedReference, {
                        reference: trimmedReference,
                        token: location.token,
                    });
                }
            }
        }
    }

    return {
        diagnostics,
        missingTeamReferences: Array.from(missingTeamReferenceByNormalized.values()),
    };
}

/**
 * Collects compact reference token locations for FROM/IMPORT/TEAM commitments.
 *
 * @param agentSource - Agent source text to inspect.
 * @returns Compact reference token locations with source ranges.
 */
function collectAgentReferenceTokenLocations(agentSource: string_book): Array<AgentReferenceTokenLocation> {
    const parsed = parseAgentSourceWithCommitments(agentSource);
    const sourceLines = agentSource.split(/\r?\n/);
    const tokenLocations: Array<AgentReferenceTokenLocation> = [];

    for (let commitmentIndex = 0; commitmentIndex < parsed.commitments.length; commitmentIndex++) {
        const commitment = parsed.commitments[commitmentIndex];
        if (!commitment || !isAgentReferenceCommitmentType(commitment.type)) {
            continue;
        }

        const startLineNumber = commitment.lineNumber;
        const nextCommitmentStartLine = parsed.commitments[commitmentIndex + 1]?.lineNumber ?? sourceLines.length + 1;
        const endLineNumber = resolveCommitmentEndLine(sourceLines, startLineNumber, nextCommitmentStartLine - 1);

        tokenLocations.push(
            ...collectCommitmentTokenLocations({
                sourceLines,
                commitment,
                startLineNumber,
                endLineNumber,
            }),
        );
    }

    return tokenLocations;
}

/**
 * Calculates where a commitment block ends in the original source.
 *
 * @param sourceLines - All source lines.
 * @param startLineNumber - 1-based line where the commitment starts.
 * @param latestPossibleEndLineNumber - Last line before the next parsed commitment.
 * @returns 1-based line where this commitment should stop scanning.
 */
function resolveCommitmentEndLine(
    sourceLines: ReadonlyArray<string>,
    startLineNumber: number,
    latestPossibleEndLineNumber: number,
): number {
    for (
        let lineNumber = startLineNumber + 1;
        lineNumber <= latestPossibleEndLineNumber && lineNumber <= sourceLines.length;
        lineNumber++
    ) {
        const sourceLine = sourceLines[lineNumber - 1] || '';
        if (HORIZONTAL_LINE_PATTERN.test(sourceLine)) {
            return lineNumber - 1;
        }
    }

    return Math.min(latestPossibleEndLineNumber, sourceLines.length);
}

/**
 * Scans commitment lines for compact reference tokens and returns their ranges.
 *
 * @param options - Source lines and commitment scan range.
 * @returns Found compact reference tokens with line/column ranges.
 */
function collectCommitmentTokenLocations(options: {
    sourceLines: ReadonlyArray<string>;
    commitment: ParsedCommitment;
    startLineNumber: number;
    endLineNumber: number;
}): Array<AgentReferenceTokenLocation> {
    const { sourceLines, commitment, startLineNumber, endLineNumber } = options;
    const locations: Array<AgentReferenceTokenLocation> = [];

    for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
        const sourceLine = sourceLines[lineNumber - 1] || '';
        const tokenMatches = extractAgentReferenceTokens(sourceLine);

        for (const tokenMatch of tokenMatches) {
            locations.push({
                commitmentType: commitment.type,
                token: tokenMatch.token,
                reference: tokenMatch.reference,
                startLineNumber: lineNumber,
                startColumn: tokenMatch.index + 1,
                endLineNumber: lineNumber,
                endColumn: tokenMatch.index + tokenMatch.length + 1,
            });
        }
    }

    return locations;
}

/**
 * Tests whether a compact token resolves to a real agent URL.
 *
 * @param location - Token to resolve.
 * @param resolver - Configured agent reference resolver.
 * @returns True when resolver reports the token as unresolved.
 */
async function isCompactReferenceUnresolved(
    location: AgentReferenceTokenLocation,
    resolver: AgentReferenceResolver,
): Promise<boolean> {
    let resolvedContent: string;

    try {
        resolvedContent = await resolver.resolveCommitmentContent(location.commitmentType, location.token);
    } catch (error) {
        console.warn('[AgentReferenceResolver] Failed to resolve compact token for diagnostics:', error);
        return false;
    }

    const normalizedResolvedContent = resolvedContent.trim();

    if (location.commitmentType === 'FROM') {
        return normalizedResolvedContent.toUpperCase() === 'VOID';
    }

    return normalizedResolvedContent.length === 0;
}

/**
 * Checks whether the commitment can contain compact agent references.
 *
 * @param commitmentType - Commitment type to evaluate.
 * @returns True when commitment can reference agents.
 */
function isAgentReferenceCommitmentType(commitmentType: BookCommitment): boolean {
    return AGENT_REFERENCE_COMMITMENT_TYPES.has(commitmentType);
}

/**
 * Creates stable key for deduplicating compact token resolution checks.
 *
 * @param location - Token location to key.
 * @returns Stable lower-cased cache key.
 */
function createLocationKey(location: AgentReferenceTokenLocation): string {
    const normalizedCommitmentType = normalizeCommitmentType(location.commitmentType);
    return `${normalizedCommitmentType}:${location.reference.trim().toLowerCase()}`;
}

/**
 * Formats unresolved-reference diagnostic message.
 *
 * @param location - Token location that could not be resolved.
 * @returns Human-readable unresolved-reference message.
 */
function createUnresolvedReferenceMessage(location: AgentReferenceTokenLocation): string {
    const commitmentType = normalizeCommitmentType(location.commitmentType);
    return `Referenced agent "${location.reference}" in ${commitmentType} commitment was not found.`;
}

/**
 * Normalizes commitment type aliases for user-facing diagnostics.
 *
 * @param commitmentType - Raw commitment type.
 * @returns Canonical commitment label.
 */
function normalizeCommitmentType(commitmentType: BookCommitment): BookCommitment | 'IMPORT' {
    return commitmentType === 'IMPORTS' ? 'IMPORT' : commitmentType;
}
