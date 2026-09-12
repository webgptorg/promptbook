import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import moment from 'moment';
import { tmpdir } from 'os';
import { join } from 'path';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import { writePromptRunTrace } from './writePromptRunTrace';

/**
 * Creates one isolated temporary project directory for a trace test.
 */
async function createTemporaryProject(): Promise<string> {
    const projectPath = await mkdtemp(join(tmpdir(), 'promptbook-coder-traces-'));
    await mkdir(join(projectPath, 'prompts'), { recursive: true });
    return projectPath;
}

/**
 * Builds a prompt file fixture living inside one temporary project.
 */
function createPromptFile(projectPath: string): PromptFile {
    const section: PromptSection = {
        index: 0,
        startLine: 0,
        endLine: 2,
        status: 'todo',
        priority: 0,
    };

    return {
        path: join(projectPath, 'prompts', 'feature.md'),
        name: 'feature.md',
        lines: ['[ ]', '', 'Implement the feature'],
        eol: '\n',
        hasFinalEol: true,
        sections: [section],
    };
}

describe('writePromptRunTrace', () => {
    let projectPath: string;

    beforeEach(async () => {
        projectPath = await createTemporaryProject();
    });

    afterEach(async () => {
        await rm(projectPath, { recursive: true, force: true });
    });

    it('writes the trace into the traces directory under the name of the prompt file', async () => {
        const file = createPromptFile(projectPath);
        const logPath = join(projectPath, 'runtime.log.txt');
        await writeFile(logPath, 'raw harness output', 'utf-8');

        const tracePath = await writePromptRunTrace({
            file,
            section: file.sections[0]!,
            runnerName: 'OpenAI Codex',
            modelName: 'gpt-5.6-astra',
            attemptCount: 1,
            startedDate: moment('2026-09-12T10:00:00.000Z'),
            finishedDate: moment('2026-09-12T10:42:00.000Z'),
            outcome: { kind: 'succeeded', steps: [] },
            logPath,
        });

        expect(tracePath).toBe(join(projectPath, 'prompts', 'traces', 'feature.md'));
        expect(await readFile(tracePath, 'utf-8')).toContain('raw harness output');
    });

    it('still writes the trace of a round whose runtime log is missing', async () => {
        const file = createPromptFile(projectPath);

        const tracePath = await writePromptRunTrace({
            file,
            section: file.sections[0]!,
            runnerName: 'OpenAI Codex',
            attemptCount: 1,
            startedDate: moment('2026-09-12T10:00:00.000Z'),
            finishedDate: moment('2026-09-12T10:42:00.000Z'),
            outcome: { kind: 'failed', error: new Error('Harness crashed') },
            logPath: join(projectPath, 'missing.log.txt'),
        });

        const traceContent = await readFile(tracePath, 'utf-8');
        expect(traceContent).toContain('-   **Outcome:** Failed');
        expect(traceContent).toContain('Harness crashed');
        expect(traceContent).toContain('_This round has produced no readable runtime log._');
    });

    it('overwrites the trace left by an earlier run of the same prompt', async () => {
        const file = createPromptFile(projectPath);
        const logPath = join(projectPath, 'runtime.log.txt');

        await writeFile(logPath, 'first run output', 'utf-8');
        await writePromptRunTrace({
            file,
            section: file.sections[0]!,
            runnerName: 'OpenAI Codex',
            attemptCount: 1,
            startedDate: moment('2026-09-12T10:00:00.000Z'),
            finishedDate: moment('2026-09-12T10:42:00.000Z'),
            outcome: { kind: 'failed', error: new Error('First run failed') },
            logPath,
        });

        await writeFile(logPath, 'second run output', 'utf-8');
        const tracePath = await writePromptRunTrace({
            file,
            section: file.sections[0]!,
            runnerName: 'Claude Code',
            attemptCount: 1,
            startedDate: moment('2026-09-12T11:00:00.000Z'),
            finishedDate: moment('2026-09-12T11:20:00.000Z'),
            outcome: { kind: 'succeeded', steps: [] },
            logPath,
        });

        const traceContent = await readFile(tracePath, 'utf-8');
        expect(traceContent).toContain('second run output');
        expect(traceContent).not.toContain('first run output');
        expect(traceContent).toContain('-   **Outcome:** Succeeded');
    });
});
