import { buildPromptLabelForDisplay } from '../prompts/buildPromptLabelForDisplay';
import { hasSufficientPriority } from '../prompts/hasSufficientPriority';
import { isPromptToBeWritten } from '../prompts/isPromptToBeWritten';
import type { PromptFile } from '../prompts/types/PromptFile';
import type { PromptSection } from '../prompts/types/PromptSection';

/**
 * Column identifiers rendered by the coder server board.
 *
 * @private internal type of `ptbk coder server`
 */
export type CoderPromptBoardStatus =
    | 'backlog'
    | 'low-priority'
    | 'todo'
    | 'in-progress'
    | 'done'
    | 'errors'
    | 'finished';

/**
 * Visual tag displayed on one board card.
 *
 * @private internal type of `ptbk coder server`
 */
export type CoderPromptBoardTag = {
    readonly label: string;
    readonly tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'active';
};

/**
 * Active runner state needed to decide whether one prompt belongs to the In progress column.
 *
 * @private internal type of `ptbk coder server`
 */
export type CoderPromptBoardActivePrompt = {
    readonly currentPromptLabel: string;
    readonly phase: string;
};

/**
 * Board classification for one prompt section.
 *
 * @private internal type of `ptbk coder server`
 */
export type CoderPromptBoardClassification = {
    readonly boardStatus: CoderPromptBoardStatus;
    readonly tags: readonly CoderPromptBoardTag[];
};

/**
 * Classifies one parsed prompt section into the coder server board columns.
 *
 * @private internal utility of `ptbk coder server`
 */
export function classifyPromptSectionForCoderBoard(options: {
    readonly file: PromptFile;
    readonly section: PromptSection;
    readonly minimumPriority: number;
    readonly activePrompt?: CoderPromptBoardActivePrompt;
}): CoderPromptBoardClassification {
    const { file, section, minimumPriority, activePrompt } = options;
    const hasAuthoringPlaceholder = isPromptToBeWritten(file, section);

    if (section.status === 'todo' && isActivePrompt(file, section, activePrompt)) {
        const isVerifying = activePrompt?.phase === 'verifying';
        return {
            boardStatus: 'in-progress',
            tags: [{ label: isVerifying ? 'Verifying' : 'Implementing', tone: 'active' }],
        };
    }

    if (section.status === 'not-ready') {
        return {
            boardStatus: 'backlog',
            tags: buildBacklogTags({ isNotReady: true, hasAuthoringPlaceholder }),
        };
    }

    if (section.status === 'todo' && hasAuthoringPlaceholder) {
        return {
            boardStatus: 'backlog',
            tags: buildBacklogTags({ isNotReady: false, hasAuthoringPlaceholder }),
        };
    }

    if (section.status === 'todo' && !hasSufficientPriority(section, minimumPriority)) {
        return {
            boardStatus: 'low-priority',
            tags: [{ label: 'Below priority', tone: 'warning' }],
        };
    }

    if (section.status === 'todo') {
        return { boardStatus: 'todo', tags: [] };
    }

    if (section.status === 'failed') {
        return { boardStatus: 'errors', tags: [] };
    }

    if (section.status === 'finished') {
        return { boardStatus: 'finished', tags: [] };
    }

    return { boardStatus: 'done', tags: [] };
}

/**
 * Builds tags that explain why a prompt is in the backlog column.
 */
function buildBacklogTags(options: {
    readonly isNotReady: boolean;
    readonly hasAuthoringPlaceholder: boolean;
}): readonly CoderPromptBoardTag[] {
    const tags: CoderPromptBoardTag[] = [];

    if (options.isNotReady) {
        tags.push({ label: '[-]', tone: 'neutral' });
    }

    if (options.hasAuthoringPlaceholder) {
        tags.push({ label: '@@@', tone: 'warning' });
    }

    return tags;
}

/**
 * Checks whether a parsed prompt matches the active prompt currently shown in the terminal UI.
 */
function isActivePrompt(
    file: PromptFile,
    section: PromptSection,
    activePrompt: CoderPromptBoardActivePrompt | undefined,
): boolean {
    if (!activePrompt || (activePrompt.phase !== 'running' && activePrompt.phase !== 'verifying')) {
        return false;
    }

    return buildPromptLabelForDisplay(file, section) === activePrompt.currentPromptLabel;
}

// Note: [🟡] Code for CLI command [coder server](scripts/run-codex-prompts/server/classifyPromptSectionForCoderBoard.ts) should never be published outside of `@promptbook/cli`
