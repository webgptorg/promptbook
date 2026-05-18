import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import {
    extractLatestUserMessageLines,
    loadAgentRunQueuedMessagePreview,
    loadAgentRunUiMetadata,
} from './loadAgentRunUiMetadata';

describe('loadAgentRunUiMetadata', () => {
    let temporaryProjectPath: string | undefined;

    afterEach(async () => {
        if (temporaryProjectPath) {
            await rm(temporaryProjectPath, { recursive: true, force: true });
            temporaryProjectPath = undefined;
        }
    });

    it('reads the local agent title from `agent.book` and returns the latest queued user message', async () => {
        temporaryProjectPath = await mkdtemp(join(tmpdir(), 'ptbk-agent-ui-'));
        const queuedMessagePath = join(temporaryProjectPath, 'messages', 'queued', 'message-0001.book');

        await mkdir(join(temporaryProjectPath, 'messages', 'queued'), { recursive: true });
        await writeFile(join(temporaryProjectPath, 'agent.book'), 'Support Assistant\n\nRULE Be concise.\n', 'utf-8');
        await writeFile(
            queuedMessagePath,
            spaceTrim(`
                MESSAGE @User
                First question

                MESSAGE @Agent
                First answer

                MESSAGE @User
                Second question
                With context
            `),
            'utf-8',
        );

        await expect(
            loadAgentRunUiMetadata(temporaryProjectPath, {
                absolutePath: queuedMessagePath,
                relativePath: 'messages/queued/message-0001.book',
                fileName: 'message-0001.book',
            }),
        ).resolves.toEqual({
            localAgentName: 'Support Assistant',
            latestUserMessageLines: ['Second question', 'With context'],
        });
    });

    it('summarizes one queued thread message for multi-agent status lines', async () => {
        temporaryProjectPath = await mkdtemp(join(tmpdir(), 'ptbk-agent-ui-'));
        const queuedMessagePath = join(temporaryProjectPath, 'messages', 'queued', 'message-0002.book');

        await mkdir(join(temporaryProjectPath, 'messages', 'queued'), { recursive: true });
        await writeFile(
            queuedMessagePath,
            spaceTrim(`
                MESSAGE @User
                First question

                MESSAGE @Agent
                First answer

                MESSAGE @User
                Second question
                With context
            `),
            'utf-8',
        );

        await expect(
            loadAgentRunQueuedMessagePreview({
                absolutePath: queuedMessagePath,
                relativePath: 'messages/queued/message-0002.book',
                fileName: 'message-0002.book',
            }),
        ).resolves.toEqual({
            queuedMessage: {
                absolutePath: queuedMessagePath,
                relativePath: 'messages/queued/message-0002.book',
                fileName: 'message-0002.book',
            },
            latestUserMessageLines: ['Second question', 'With context'],
            latestUserMessageSummary: 'Second question With context',
        });
    });
});

describe('extractLatestUserMessageLines', () => {
    it('falls back to the full file when no `MESSAGE @User` block exists', () => {
        expect(extractLatestUserMessageLines('Plain text message\nWithout a structured block')).toEqual([
            'Plain text message',
            'Without a structured block',
        ]);
    });
});
