import { join } from 'path';
import moment from 'moment';
import { parsePromptFile } from '../prompts/parsePromptFile';
import { buildPromptLabelForDisplay } from '../prompts/buildPromptLabelForDisplay';
import type { PromptFile } from '../prompts/types/PromptFile';
import { CoderRunUiState } from '../ui/CoderRunUiState';
import {
    buildCoderServerPromptFileResponses,
    type CoderServerPromptSectionResponse,
} from './buildCoderServerPromptResponse';

/**
 * Builds a parsed prompt file under the current project path.
 */
function createPromptFile(relativeFilePath: string, content: string): PromptFile {
    return parsePromptFile(join(process.cwd(), relativeFilePath), content.trim());
}

/**
 * Finds one section by its summary.
 */
function findSection(
    sections: readonly CoderServerPromptSectionResponse[],
    summary: string,
): CoderServerPromptSectionResponse {
    const section = sections.find((sectionCandidate) => sectionCandidate.summary === summary);

    if (!section) {
        throw new Error(`Missing test section: ${summary}`);
    }

    return section;
}

describe('buildCoderServerPromptFileResponses', () => {
    it('classifies prompt sections into the server board columns', () => {
        const promptFile = createPromptFile(
            'prompts/queue.md',
            `
            [ ] !!
            Active ready prompt
            ---
            [ ] !!
            Ready prompt
            ---
            [ ] !
            Lower priority prompt
            ---
            [ ] !!
            @@@ Unwritten prompt
            ---
            [-]
            Draft prompt
            ---
            [-]
            @@@ Draft unwritten prompt
            ---
            [x] done by agent
            Done prompt
            ---
            [!] failed by agent
            Failed prompt
        `,
        );
        const finishedPromptFile = createPromptFile(
            'prompts/done/finished.md',
            `
            [x] verified
            Finished prompt
        `,
        );
        const uiState = new CoderRunUiState(moment());
        uiState.setCurrentPrompt(buildPromptLabelForDisplay(promptFile, promptFile.sections[0]!));
        uiState.setPhase('verifying');

        const responses = buildCoderServerPromptFileResponses({
            promptFiles: [promptFile],
            finishedPromptFiles: [finishedPromptFile],
            priorityFilter: { minimumPriority: 2 },
            uiState,
        });
        const sections = responses.flatMap((response) => response.sections);

        expect(findSection(sections, 'Active ready prompt')).toMatchObject({
            column: 'in-progress',
            tags: [{ id: 'verifying', label: 'Verifying' }],
        });
        expect(findSection(sections, 'Ready prompt').column).toBe('todo');
        expect(findSection(sections, 'Lower priority prompt').column).toBe('low-priority');
        expect(findSection(sections, '@@@ Unwritten prompt')).toMatchObject({
            column: 'backlog',
            tags: [{ id: 'unwritten', label: '@@@' }],
        });
        expect(findSection(sections, 'Draft prompt')).toMatchObject({
            column: 'backlog',
            tags: [{ id: 'not-ready', label: '[-]' }],
        });
        expect(findSection(sections, '@@@ Draft unwritten prompt')).toMatchObject({
            column: 'backlog',
            tags: [
                { id: 'not-ready', label: '[-]' },
                { id: 'unwritten', label: '@@@' },
            ],
        });
        expect(findSection(sections, 'Done prompt').column).toBe('done');
        expect(findSection(sections, 'Failed prompt').column).toBe('errors');
        expect(findSection(sections, 'Finished prompt').column).toBe('finished');
    });

    it('uses the implementing tag for the active running prompt', () => {
        const promptFile = createPromptFile(
            'prompts/active.md',
            `
            [ ] !
            Running prompt
        `,
        );
        const uiState = new CoderRunUiState(moment());
        uiState.setCurrentPrompt(buildPromptLabelForDisplay(promptFile, promptFile.sections[0]!));
        uiState.setPhase('running');

        const responses = buildCoderServerPromptFileResponses({
            promptFiles: [promptFile],
            finishedPromptFiles: [],
            priorityFilter: { minimumPriority: 1 },
            uiState,
        });

        expect(responses[0]?.sections[0]).toMatchObject({
            column: 'in-progress',
            tags: [{ id: 'implementing', label: 'Implementing' }],
        });
    });
});
