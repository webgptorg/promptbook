import { readFile, realpath } from 'fs/promises';
import { relative } from 'path';
import { isPromptToBeWritten } from '../../../../../scripts/run-codex-prompts/prompts/isPromptToBeWritten';
import { PTBK_CODER_IGNORE_MARKER } from '../../../../../scripts/run-codex-prompts/prompts/loadPromptFiles';
import { parsePromptFile } from '../../../../../scripts/run-codex-prompts/prompts/parsePromptFile';
import { formatPromptEmojiTag, getFreshPromptEmojiTags } from '../../../../../scripts/utils/prompts/promptEmojiTags';
import { NotAllowed } from '../../../../errors/NotAllowed';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';
import { prepareCoderPrompt } from '../add';
import { resolvePlanningPath } from './resolvePlanningPath';
import type { PlanningProposal } from './planningProtocol';

/**
 * A fully rendered change retained in memory until the user explicitly saves it.
 * @private internal type of `coder plan`
 */
export type PlanningChange = {
    readonly path: string;
    readonly before: string | null;
    readonly after: string;
    readonly draft: string;
};

/**
 * Prepares an entire proposal set without writing. Exact replacements preserve unrelated content and line endings.
 * @private internal utility of `coder plan`
 */
export async function preparePlanningChanges(
    projectPath: string,
    proposals: ReadonlyArray<PlanningProposal>,
    templateOption: string | undefined,
): Promise<PlanningChange[]> {
    const canonicalProjectPath = await realpath(projectPath);
    const createdCount = proposals.filter((proposal) => proposal.kind === 'create').length;
    const { selectedEmojis } = createdCount
        ? await getFreshPromptEmojiTags({ count: createdCount, rootDir: projectPath, isCacheWriteEnabled: false })
        : { selectedEmojis: [] };
    const changes: PlanningChange[] = [];
    let numberOffset = 0;
    for (const proposal of proposals) {
        if (proposal.kind === 'create') {
            const prepared = await prepareCoderPrompt({
                projectPath,
                description: `${proposal.title}\n\n${proposal.body}`,
                priority: proposal.priority,
                templateOption,
                numberOffset,
                reservedEmojiTag: formatPromptEmojiTag(selectedEmojis[numberOffset]!),
            });
            numberOffset++;
            const path = prepared.filePath.replace(/\\/gu, '/');
            resolvePlanningPath(projectPath, path, true);
            const draft = prepared.content.replace(/^\[ \]/u, '[-]');
            const after = proposal.isReady ? prepared.content : draft;
            const parsed = parsePromptFile(path, after);
            if (
                after.includes(PTBK_CODER_IGNORE_MARKER) ||
                parsed.sections.length !== 1 ||
                (proposal.isReady && isPromptToBeWritten(parsed, parsed.sections[0]!))
            ) {
                throw new NotAllowed(
                    spaceTrim(
                        'A new proposal must contain one task without task separators or a queue ignore marker; unresolved placeholders require a draft. Split related tasks into separate proposals.',
                    ),
                );
            }
            changes.push({ path, before: null, after, draft });
            continue;
        }
        const absolutePath = await realpath(resolvePlanningPath(projectPath, proposal.path, true));
        const path = relative(canonicalProjectPath, absolutePath).replace(/\\/gu, '/');
        const previous = changes.find((change) =>
            process.platform === 'win32' ? change.path.toLowerCase() === path.toLowerCase() : change.path === path,
        );
        if (previous) {
            throw new NotAllowed(
                spaceTrim(
                    `Propose one exact replacement per file per preview: \`${path}\`. Further revisions can be saved in the next turn.`,
                ),
            );
        }
        const before = await readFile(absolutePath, 'utf-8');
        if (before.includes(PTBK_CODER_IGNORE_MARKER)) {
            throw new NotAllowed(
                spaceTrim(
                    `\`${path}\` is excluded from the PRD queue. Its context and ignore marker must be preserved.`,
                ),
            );
        }
        const file = parsePromptFile(path, before);
        const find = proposal.find.replace(/\r?\n/gu, file.eol);
        const replacement = proposal.replace.replace(/\r?\n/gu, file.eol);
        const start = before.indexOf(find);
        if (start < 0 || before.indexOf(find, start + 1) !== -1) {
            throw new NotAllowed(
                spaceTrim(
                    `Edit in \`${path}\` must match one unique, unchanged text passage. Read it again before revising.`,
                ),
            );
        }
        const startLine = before.slice(0, start).split(/\r?\n/u).length - 1;
        const endLine = startLine + find.split(/\r?\n/u).length - 1;
        const section = file.sections.find(
            (candidate) => candidate.startLine <= startLine && candidate.endLine >= endLine,
        );
        if (!section || !['todo', 'not-ready'].includes(section.status)) {
            throw new NotAllowed(
                spaceTrim(
                    `Only pending or draft task bodies may be revised in \`${path}\`. Create new follow-up work as a new task.`,
                ),
            );
        }
        const identityLineIndex = file.lines.findIndex(
            (line, index) =>
                index >= (section.statusLineIndex === undefined ? section.startLine : section.statusLineIndex + 1) &&
                index <= section.endLine &&
                line.trim() !== '',
        );
        if (startLine <= identityLineIndex || /^\s*---\s*$/mu.test(replacement)) {
            throw new NotAllowed(
                spaceTrim(
                    `Preserve task identity and lifecycle metadata in \`${path}\`; replace only the body of one task.`,
                ),
            );
        }
        let after = before.slice(0, start) + replacement + before.slice(start + find.length);
        if (after.includes(PTBK_CODER_IGNORE_MARKER)) {
            throw new NotAllowed(spaceTrim(`An edit cannot change the queue ignore metadata in \`${path}\`.`));
        }
        const afterFile = parsePromptFile(path, after);
        if (afterFile.sections.length !== file.sections.length) {
            throw new NotAllowed(spaceTrim(`An edit cannot add or remove task sections in \`${path}\`.`));
        }
        if (proposal.isReady && isPromptToBeWritten(afterFile, afterFile.sections[section.index]!)) {
            throw new NotAllowed(
                spaceTrim(
                    `Unresolved placeholders in \`${path}\` require a draft; finish the entire task before marking it ready.`,
                ),
            );
        }
        const statusLine = section.statusLineIndex === undefined ? undefined : file.lines[section.statusLineIndex]!;
        const lines = after.split(/\r?\n/u);
        if (statusLine === undefined || section.statusLineIndex === undefined) {
            if (section.status !== 'todo') {
                throw new NotAllowed(
                    spaceTrim(
                        `Unsupported lifecycle metadata in \`${path}\` must be preserved; create a new task instead.`,
                    ),
                );
            }
            const draftLines = [...lines];
            draftLines.splice(identityLineIndex, 0, '[-]', '');
            const draft = draftLines.join(file.eol);
            changes.push({ path, before, after: proposal.isReady ? after : draft, draft });
            continue;
        }
        // Ready tasks retain routing tokens and priority verbatim. Draft promotion preserves the remaining suffix.
        if (proposal.isReady && section.status === 'not-ready') {
            lines[section.statusLineIndex] = statusLine.replace(/^(\s*)\[(?:-|\.)\]/u, '$1[ ]');
            after = lines.join(file.eol);
        }
        // The parser supports clean [-] with priority marks. Refuse to discard model/agent metadata to make a draft.
        const isDraftConversionSupported = /^\s*\[(?: |-|\.)\][!\s]*$/u.test(statusLine);
        const draftLines = [...lines];
        if (isDraftConversionSupported)
            draftLines[section.statusLineIndex] = statusLine.replace(/^(\s*)\[.\]/u, '$1[-]');
        if (!proposal.isReady && !isDraftConversionSupported) {
            throw new NotAllowed(
                spaceTrim(
                    `Cannot convert routed task \`${path}\` into a draft without losing metadata. Keep the revision unsaved or create a separate draft task.`,
                ),
            );
        }
        const draft = isDraftConversionSupported ? draftLines.join(file.eol) : '';
        changes.push({ path, before, after: proposal.isReady ? after : draft, draft });
    }
    return changes;
}
