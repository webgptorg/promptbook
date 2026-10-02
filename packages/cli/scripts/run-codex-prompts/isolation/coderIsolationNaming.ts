import {
    getPromptbookTemporaryPath,
    resolvePromptbookTemporaryPath,
} from '../../../src/utils/filesystem/promptbookTemporaryPath';
import { buildPromptSectionSuffix } from '../prompts/buildPromptSectionSuffix';
import type { PromptFile } from '../prompts/types/PromptFile';
import type { PromptSection } from '../prompts/types/PromptSection';

/**
 * Temporary subdirectory holding every worktree created by `ptbk coder run --isolate`.
 */
export const CODER_ISOLATION_WORKTREES_DIRECTORY_NAME = 'coder-isolation-worktrees';

/**
 * Prefix of every git branch created by `ptbk coder run --isolate`.
 */
export const CODER_ISOLATION_BRANCH_PREFIX = 'ptbk-coder-isolation';

/**
 * Builds the isolation task name of one prompt section, for example `2026-07-0700-ptbk-coder-timing`.
 */
export function buildCoderIsolationTaskName(file: PromptFile, section: PromptSection): string {
    const promptFileNameWithoutExtension = file.name.replace(/\.[^.]+$/u, '');
    return `${promptFileNameWithoutExtension}${buildPromptSectionSuffix(file, section)}`;
}

/**
 * Builds the git branch name used for one isolated task.
 */
export function buildCoderIsolationBranchName(taskName: string): string {
    return `${CODER_ISOLATION_BRANCH_PREFIX}/${taskName}`;
}

/**
 * Builds the absolute worktree path used for one isolated task.
 */
export function buildCoderIsolationWorktreePath(projectPath: string, taskName: string): string {
    return resolvePromptbookTemporaryPath(projectPath, CODER_ISOLATION_WORKTREES_DIRECTORY_NAME, taskName);
}

/**
 * Builds the project-relative worktree path of one isolated task, used in human-facing messages.
 */
export function buildCoderIsolationWorktreeDisplayPath(taskName: string): string {
    return getPromptbookTemporaryPath(CODER_ISOLATION_WORKTREES_DIRECTORY_NAME, taskName);
}
