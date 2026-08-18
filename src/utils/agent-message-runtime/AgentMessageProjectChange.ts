/**
 * One file an answered agent message created, edited or deleted inside one project.
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @private internal type of the agent-message runtime
 */
export type AgentMessageProjectChangedFile = {
    /**
     * Path of the file relative to the project root, using `/` separators.
     */
    readonly path: string;

    /**
     * Count of lines added to the file.
     */
    readonly insertionCount: number;

    /**
     * Count of lines removed from the file.
     */
    readonly deletionCount: number;
};

/**
 * Everything answering one single message changed inside one agent project.
 *
 * Each agent project is a git repository and every answer which modifies it is committed there
 * automatically, so this describes exactly one such commit — the trace of what one message really
 * did to one project, which a chat can show below the answer that did it.
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @private internal type of the agent-message runtime
 */
export type AgentMessageProjectChange = {
    /**
     * Directory name of the changed project inside the agent `projects/` folder.
     */
    readonly projectName: string;

    /**
     * Full hash of the commit holding the changes of this message.
     */
    readonly commitHash: string;

    /**
     * ISO 8601 timestamp when the changes were committed.
     */
    readonly committedAt: string;

    /**
     * Files the message changed, ordered as git reports them.
     */
    readonly changedFiles: ReadonlyArray<AgentMessageProjectChangedFile>;

    /**
     * Count of lines added across all changed files.
     */
    readonly insertionCount: number;

    /**
     * Count of lines removed across all changed files.
     */
    readonly deletionCount: number;

    /**
     * Unified diff of the commit, shortened when the change is too large to carry into a chat.
     */
    readonly diff: string;

    /**
     * Whether `diff` holds only the beginning of the real diff.
     */
    readonly isDiffTruncated: boolean;
};

/**
 * Validates one already-parsed JSON value as a project change.
 *
 * @param value - Raw serialized project change.
 * @returns The typed project change, or `null` when the value does not match the expected shape,
 * so consumers can silently skip foreign or malformed entries.
 *
 * @private internal utility of the agent-message runtime
 */
export function normalizeAgentMessageProjectChange(value: unknown): AgentMessageProjectChange | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const candidate = value as Partial<AgentMessageProjectChange>;
    if (!isNonEmptyString(candidate.projectName) || !isNonEmptyString(candidate.commitHash)) {
        return null;
    }

    if (!isNonEmptyString(candidate.committedAt) || !Number.isFinite(Date.parse(candidate.committedAt))) {
        return null;
    }

    if (!Array.isArray(candidate.changedFiles)) {
        return null;
    }

    const changedFiles = candidate.changedFiles.map((changedFile) =>
        normalizeAgentMessageProjectChangedFile(changedFile),
    );
    if (changedFiles.some((changedFile) => changedFile === null)) {
        return null;
    }

    if (!isChangeCount(candidate.insertionCount) || !isChangeCount(candidate.deletionCount)) {
        return null;
    }

    if (typeof candidate.diff !== 'string' || typeof candidate.isDiffTruncated !== 'boolean') {
        return null;
    }

    return {
        projectName: candidate.projectName.trim(),
        commitHash: candidate.commitHash.trim(),
        committedAt: candidate.committedAt,
        changedFiles: changedFiles as ReadonlyArray<AgentMessageProjectChangedFile>,
        insertionCount: candidate.insertionCount,
        deletionCount: candidate.deletionCount,
        diff: candidate.diff,
        isDiffTruncated: candidate.isDiffTruncated,
    };
}

/**
 * Validates one already-parsed JSON value as a changed project file.
 *
 * @param value - Raw serialized changed file.
 * @returns The typed changed file, or `null` when the value does not match the expected shape.
 *
 * @private internal helper of `normalizeAgentMessageProjectChange`
 */
function normalizeAgentMessageProjectChangedFile(value: unknown): AgentMessageProjectChangedFile | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const candidate = value as Partial<AgentMessageProjectChangedFile>;
    if (!isNonEmptyString(candidate.path)) {
        return null;
    }

    if (!isChangeCount(candidate.insertionCount) || !isChangeCount(candidate.deletionCount)) {
        return null;
    }

    return {
        path: candidate.path.trim(),
        insertionCount: candidate.insertionCount,
        deletionCount: candidate.deletionCount,
    };
}

/**
 * Checks that one value is a usable non-empty string.
 *
 * @param value - Raw serialized value.
 * @returns Whether the value is a string carrying content.
 *
 * @private internal helper of `normalizeAgentMessageProjectChange`
 */
function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks that one value is a line count git could have reported.
 *
 * @param value - Raw serialized value.
 * @returns Whether the value is a non-negative finite number.
 *
 * @private internal helper of `normalizeAgentMessageProjectChange`
 */
function isChangeCount(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
