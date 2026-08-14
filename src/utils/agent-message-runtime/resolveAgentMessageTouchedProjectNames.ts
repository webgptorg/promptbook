import { AGENT_PROJECTS_DIRECTORY_PATH } from '../../book-3.0/agentFolderPaths';
import type { AgentMessageRuntimeLogEvent } from './parseAgentMessageRuntimeLogEvents';
import { parseAgentMessageRuntimeLogEvents } from './parseAgentMessageRuntimeLogEvents';

/**
 * Matches one project directory name following the agent `projects/` folder in a file path or command.
 *
 * Both path separators are accepted because the local runner answers messages on Unix and Windows,
 * and JSON-encoded payloads escape backslashes.
 *
 * @private internal constant of agent-message touched projects
 */
const TOUCHED_PROJECT_PATH_REGEX = new RegExp(`${AGENT_PROJECTS_DIRECTORY_PATH}[\\\\/]+([^\\\\/"'\\s,;:]+)`, 'giu');

/**
 * Resolves which projects one coding harness touched while answering a single message.
 *
 * The runtime log streams what the harness really did, so a project counts as touched when the
 * harness named it in a tool invocation — reading, searching, running, or editing files inside
 * `projects/<project-name>/`. Only tool payloads are inspected: tool results and assistant
 * narration are ignored so a project merely mentioned in the conversation is never reported.
 *
 * Every candidate is matched against the projects that really exist, which both filters prompt
 * placeholders such as `projects/<project-name>/` and keeps the reported names canonical.
 *
 * @param options - Raw runtime log content and the project directory names of the agent.
 * @returns Touched project names in the canonical spelling, ordered by first appearance.
 * @private internal utility of the agent-message runtime
 */
export function resolveAgentMessageTouchedProjectNames(options: {
    readonly logText: string | null | undefined;
    readonly knownProjectNames: ReadonlyArray<string>;
}): ReadonlyArray<string> {
    const canonicalProjectNames = createCanonicalProjectNameLookup(options.knownProjectNames);
    if (canonicalProjectNames.size === 0) {
        return [];
    }

    const touchedProjectNames = new Set<string>();

    for (const event of parseAgentMessageRuntimeLogEvents(options.logText)) {
        for (const toolInvocationText of resolveRuntimeLogEventToolInvocationTexts(event)) {
            for (const candidateProjectName of resolveCandidateProjectNames(toolInvocationText)) {
                const canonicalProjectName = canonicalProjectNames.get(candidateProjectName.toLowerCase());

                if (canonicalProjectName !== undefined) {
                    touchedProjectNames.add(canonicalProjectName);
                }
            }
        }
    }

    return Array.from(touchedProjectNames);
}

/**
 * Indexes the existing project directory names by their lower-cased form.
 *
 * @param knownProjectNames - Project directory names of the agent.
 * @returns Lookup from the lower-cased name to its canonical spelling.
 * @private internal helper of `resolveAgentMessageTouchedProjectNames`
 */
function createCanonicalProjectNameLookup(knownProjectNames: ReadonlyArray<string>): Map<string, string> {
    const canonicalProjectNames = new Map<string, string>();

    for (const knownProjectName of knownProjectNames) {
        const normalizedProjectName = knownProjectName.trim();

        if (normalizedProjectName.length > 0) {
            canonicalProjectNames.set(normalizedProjectName.toLowerCase(), normalizedProjectName);
        }
    }

    return canonicalProjectNames;
}

/**
 * Collects the texts of every tool invocation described by one runtime log event.
 *
 * Claude Code reports tool invocations as `tool_use` content blocks, while Codex reports executed
 * commands and file changes as items — both carry the paths the harness worked with.
 *
 * @param event - One structured runtime log event.
 * @returns Texts that may contain project paths.
 * @private internal helper of `resolveAgentMessageTouchedProjectNames`
 */
function resolveRuntimeLogEventToolInvocationTexts(event: AgentMessageRuntimeLogEvent): ReadonlyArray<string> {
    const toolInvocationTexts: Array<string> = [];

    for (const contentBlock of event.message?.content || []) {
        if (contentBlock.type === 'tool_use' && contentBlock.input) {
            toolInvocationTexts.push(serializeToolInput(contentBlock.input));
        }
    }

    if (typeof event.item?.command === 'string') {
        toolInvocationTexts.push(event.item.command);
    }

    for (const fileChange of event.item?.changes || []) {
        if (typeof fileChange.path === 'string') {
            toolInvocationTexts.push(fileChange.path);
        }
    }

    return toolInvocationTexts;
}

/**
 * Serializes one tool input payload into scannable text.
 *
 * @param toolInput - Tool arguments of one harness tool invocation.
 * @returns Serialized payload, or an empty string when it cannot be serialized.
 * @private internal helper of `resolveAgentMessageTouchedProjectNames`
 */
function serializeToolInput(toolInput: Record<string, unknown>): string {
    try {
        return JSON.stringify(toolInput);
    } catch {
        return '';
    }
}

/**
 * Extracts every project directory name mentioned right after the agent `projects/` folder.
 *
 * @param toolInvocationText - One tool payload, command, or changed path.
 * @returns Candidate project directory names.
 * @private internal helper of `resolveAgentMessageTouchedProjectNames`
 */
function resolveCandidateProjectNames(toolInvocationText: string): ReadonlyArray<string> {
    const candidateProjectNames: Array<string> = [];
    const projectPathRegex = new RegExp(TOUCHED_PROJECT_PATH_REGEX.source, TOUCHED_PROJECT_PATH_REGEX.flags);
    let projectPathMatch = projectPathRegex.exec(toolInvocationText);

    while (projectPathMatch !== null) {
        const candidateProjectName = projectPathMatch[1];

        if (candidateProjectName) {
            candidateProjectNames.push(candidateProjectName);
        }

        projectPathMatch = projectPathRegex.exec(toolInvocationText);
    }

    return candidateProjectNames;
}
