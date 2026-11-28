import { resolvePromptStatusLine } from '../prompts/resolvePromptStatusLine';
import type { PromptFile } from '../prompts/types/PromptFile';
import type { PromptSection } from '../prompts/types/PromptSection';
import { buildCoderIsolationMergeFailureStatusNote } from './coderIsolationMergeFailureReport';
import type { CoderIsolationWorktree } from './CoderIsolationWorktree';

/**
 * Matches the leading status box of one prompt status line, for example `[ ]`, `[x]` or `[!]`.
 */
const PROMPT_STATUS_BOX_PATTERN = /^(?<indentation>\s*)\[[^\]]*\]/u;

/**
 * Rewrites the status of one prompt whose isolated implementation could not be merged back.
 *
 * The prompt has already been marked as done by the isolated round, so the recorded runner metadata is
 * kept and only the status box turns from `[x]` into `[!]`, followed by the manual merge instructions.
 */
export function markPromptIsolationMergeFailed(
    file: PromptFile,
    section: PromptSection,
    worktree: CoderIsolationWorktree,
): void {
    const { statusLineIndex, line } = resolvePromptStatusLine(file, section);

    const failedStatusLine = line.replace(PROMPT_STATUS_BOX_PATTERN, '$<indentation>[!]');
    file.lines[statusLineIndex] = `${failedStatusLine} - ${buildCoderIsolationMergeFailureStatusNote(worktree)}`;
}
