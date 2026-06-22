import { relative } from 'path';
import { buildCodexPrompt } from '../prompts/buildCodexPrompt';
import { buildPromptLabelForDisplay } from '../prompts/buildPromptLabelForDisplay';
import { buildPromptSummary } from '../prompts/buildPromptSummary';
import { hasSufficientPriority } from '../prompts/hasSufficientPriority';
import { isPromptToBeWritten } from '../prompts/isPromptToBeWritten';
import type { PromptFile } from '../prompts/types/PromptFile';
import type { PromptSection } from '../prompts/types/PromptSection';
import type { PromptStatus } from '../prompts/types/PromptStatus';
import type { CoderRunPhase, CoderRunUiState } from '../ui/CoderRunUiState';

/**
 * Browser board columns used by `ptbk coder server`.
 */
export type CoderServerBoardColumn =
    | 'backlog'
    | 'low-priority'
    | 'todo'
    | 'in-progress'
    | 'done'
    | 'errors'
    | 'finished';

/**
 * UI tag attached to one prompt card.
 */
export type CoderServerPromptTag = {
    readonly id: 'not-ready' | 'unwritten' | 'implementing' | 'verifying';
    readonly label: string;
};

/**
 * One prompt section as returned from `GET /api/prompts`.
 */
export type CoderServerPromptSectionResponse = {
    readonly index: number;
    readonly status: PromptStatus;
    readonly column: CoderServerBoardColumn;
    readonly priority: number;
    readonly summary: string;
    readonly content: string;
    readonly label: string;
    readonly tags: readonly CoderServerPromptTag[];
};

/**
 * One prompt file as returned from `GET /api/prompts`.
 */
export type CoderServerPromptFileResponse = {
    readonly filePath: string;
    readonly fileName: string;
    readonly relativeFilePath: string;
    readonly isFinished: boolean;
    readonly sections: readonly CoderServerPromptSectionResponse[];
};

/**
 * Input for converting parsed prompt files into the browser API shape.
 */
export type BuildCoderServerPromptFileResponsesOptions = {
    readonly promptFiles: readonly PromptFile[];
    readonly finishedPromptFiles: readonly PromptFile[];
    readonly minimumPriority: number;
    readonly uiState?: CoderRunUiState;
};

/**
 * Converts parsed prompt files into a web-board response with derived columns and tags.
 */
export function buildCoderServerPromptFileResponses(
    options: BuildCoderServerPromptFileResponsesOptions,
): CoderServerPromptFileResponse[] {
    const activePrompt = getActivePrompt(options.uiState);

    return [
        ...options.promptFiles.map((promptFile) =>
            buildCoderServerPromptFileResponse({
                promptFile,
                isFinished: false,
                minimumPriority: options.minimumPriority,
                activePrompt,
            }),
        ),
        ...options.finishedPromptFiles.map((promptFile) =>
            buildCoderServerPromptFileResponse({
                promptFile,
                isFinished: true,
                minimumPriority: options.minimumPriority,
                activePrompt,
            }),
        ),
    ];
}

/**
 * Builds one prompt-file response.
 */
function buildCoderServerPromptFileResponse(options: {
    readonly promptFile: PromptFile;
    readonly isFinished: boolean;
    readonly minimumPriority: number;
    readonly activePrompt?: ActivePrompt;
}): CoderServerPromptFileResponse {
    const { promptFile, isFinished, minimumPriority, activePrompt } = options;

    return {
        filePath: promptFile.path,
        fileName: promptFile.name,
        relativeFilePath: relative(process.cwd(), promptFile.path).replace(/\\/gu, '/'),
        isFinished,
        sections: promptFile.sections.map((section) =>
            buildCoderServerPromptSectionResponse({
                promptFile,
                section,
                isFinished,
                minimumPriority,
                activePrompt,
            }),
        ),
    };
}

/**
 * Builds one prompt-section response with derived board metadata.
 */
function buildCoderServerPromptSectionResponse(options: {
    readonly promptFile: PromptFile;
    readonly section: PromptSection;
    readonly isFinished: boolean;
    readonly minimumPriority: number;
    readonly activePrompt?: ActivePrompt;
}): CoderServerPromptSectionResponse {
    const { promptFile, section, isFinished, minimumPriority, activePrompt } = options;
    const isUnwritten = isPromptToBeWritten(promptFile, section);
    const isActive = isPromptActive(promptFile, section, activePrompt);
    const column = getPromptColumn({
        section,
        isFinished,
        isUnwritten,
        isActive,
        minimumPriority,
    });

    return {
        index: section.index,
        status: section.status,
        column,
        priority: section.priority,
        summary: buildPromptSummary(promptFile, section),
        content: buildCodexPrompt(promptFile, section),
        label: buildPromptLabelForDisplay(promptFile, section),
        tags: buildPromptTags({
            section,
            isUnwritten,
            isActive,
            activePrompt,
        }),
    };
}

/**
 * Chooses the web-board column for one prompt section without changing persisted prompt status.
 */
function getPromptColumn(options: {
    readonly section: PromptSection;
    readonly isFinished: boolean;
    readonly isUnwritten: boolean;
    readonly isActive: boolean;
    readonly minimumPriority: number;
}): CoderServerBoardColumn {
    const { section, isFinished, isUnwritten, isActive, minimumPriority } = options;

    if (isFinished) {
        return 'finished';
    }

    if (section.status === 'failed') {
        return 'errors';
    }

    if (section.status === 'done') {
        return 'done';
    }

    if (section.status === 'not-ready' || isUnwritten) {
        return 'backlog';
    }

    if (isActive) {
        return 'in-progress';
    }

    if (!hasSufficientPriority(section, minimumPriority)) {
        return 'low-priority';
    }

    return 'todo';
}

/**
 * Builds all tags shown on a prompt card.
 */
function buildPromptTags(options: {
    readonly section: PromptSection;
    readonly isUnwritten: boolean;
    readonly isActive: boolean;
    readonly activePrompt?: ActivePrompt;
}): CoderServerPromptTag[] {
    const tags: CoderServerPromptTag[] = [];

    if (options.section.status === 'not-ready') {
        tags.push({ id: 'not-ready', label: '[-]' });
    }

    if (options.isUnwritten) {
        tags.push({ id: 'unwritten', label: '@@@' });
    }

    if (options.isActive) {
        tags.push(
            options.activePrompt?.phase === 'verifying'
                ? { id: 'verifying', label: 'Verifying' }
                : { id: 'implementing', label: 'Implementing' },
        );
    }

    return tags;
}

/**
 * Active prompt identity derived from the shared run state.
 */
type ActivePrompt = {
    readonly label: string;
    readonly phase: CoderRunPhase;
};

/**
 * Extracts an active prompt only while an agent is implementing or verifying it.
 */
function getActivePrompt(uiState: CoderRunUiState | undefined): ActivePrompt | undefined {
    if (!uiState?.currentPromptLabel) {
        return undefined;
    }

    if (uiState.phase !== 'running' && uiState.phase !== 'verifying') {
        return undefined;
    }

    return {
        label: uiState.currentPromptLabel,
        phase: uiState.phase,
    };
}

/**
 * Checks whether a parsed section is the prompt currently handled by the active agent.
 */
function isPromptActive(promptFile: PromptFile, section: PromptSection, activePrompt: ActivePrompt | undefined): boolean {
    if (!activePrompt || section.status !== 'todo') {
        return false;
    }

    return buildPromptLabelForDisplay(promptFile, section) === activePrompt.label;
}

// Note: [🟡] Code for CLI command [coder server](scripts/run-codex-prompts/server/buildCoderServerPromptResponse.ts) should never be published outside of `@promptbook/cli`
