import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import { normalizeCheckCommandOption } from '../../../src/cli/cli-commands/common/coderCheckCliOptions';
import { spaceTrim } from 'spacetrim';
import { CHECK_REPAIR_INSTRUCTIONS } from './checkRepairInstructions';
import { CHECK_SETUP_PLACEHOLDER_COMMAND, CoderCheckSetupError } from './projectCheck';
import { createCheckBeforeRepairPrompt } from './createCheckBeforeRepairPrompt';
import { runCheckBefore } from './runCheckBefore';
import { runPromptCheckCommand } from './runPromptCheckCommand';
import { runPromptWithCheckFeedback } from './runPromptWithCheckFeedback';

describe('real project checks and repair feedback', () => {
    let projectPath: string;
    beforeEach(async () => {
        projectPath = await mkdtemp(join(tmpdir(), 'ptbk project checks '));
        await writeFile(
            join(projectPath, 'stage.cjs'),
            spaceTrim(`
            const fs = require('fs');
            const stage = process.argv[2];
            console.log(stage === 'test' ? 'All tests passed!' : stage + ' stdout');
            if (fs.existsSync('failure.txt') && fs.readFileSync('failure.txt', 'utf8') === stage) {
                console.error(stage + ' failure on stderr');
                process.exit(1);
            }
        `),
        );
        await writeFile(
            join(projectPath, 'package.json'),
            JSON.stringify({
                scripts: {
                    check: 'npm test && npm run lint && npm run typecheck && npm run build',
                    test: 'node stage.cjs test',
                    lint: 'node stage.cjs lint',
                    typecheck: 'node stage.cjs typecheck',
                    build: 'node stage.cjs build',
                },
            }),
        );
    });
    afterEach(async () => {
        await rm(projectPath, { recursive: true, force: true });
    });

    it.each(['test', 'lint', 'typecheck', 'build'])(
        'fails the aggregate on %s and includes its stderr in repair feedback',
        async (stage) => {
            await writeFile(join(projectPath, 'failure.txt'), stage);
            const result = await runCheckBefore({ checkCommand: 'npm run check', projectPath });
            expect(result.isPassed).toBe(false);
            expect(result.checkOutput).toContain('All tests passed!');
            expect(result.checkOutput).toContain(`${stage} failure on stderr`);
            const runPrompt = jest.fn().mockResolvedValue({ usage: UNCERTAIN_USAGE });
            await runPromptWithCheckFeedback({
                runner: { name: 'fixture', runPrompt },
                prompt: 'Fix the feature',
                projectPath,
                promptLabel: 'fixture',
                scriptPath: join(projectPath, 'repair.sh'),
                checkCommand: 'npm run check',
                runPromptCheckCommandExecutor: jest
                    .fn()
                    .mockRejectedValueOnce(new Error(result.checkOutput))
                    .mockResolvedValueOnce('checks passed'),
            });
            expect(runPrompt.mock.calls[1][0].prompt).toContain(`${stage} failure on stderr`);
            expect(runPrompt.mock.calls[1][0].prompt).toContain('Check command: `npm run check`');
            expect(runPrompt.mock.calls[1][0].prompt).toContain(CHECK_REPAIR_INSTRUCTIONS);
            const repair = await createCheckBeforeRepairPrompt({
                projectPath,
                checkCommand: 'npm run check',
                checkOutput: result.checkOutput,
            });
            const repairContent = await readFile(repair.file.path, 'utf-8');
            expect(repairContent).toContain(CHECK_REPAIR_INSTRUCTIONS);
            expect(repairContent).toContain(`${stage} failure on stderr`);
            for (const instructions of [runPrompt.mock.calls[1][0].prompt, repairContent]) {
                expect(instructions).toContain(
                    'lint, typechecking, build, generated-code consistency, or test failure',
                );
                expect(instructions).toMatch(
                    /Do not delete assertions, disable lint rules, remove failing checks from the aggregate, lower quality thresholds,\s+skip a build, or force exit code zero/,
                );
                expect(instructions).toContain("Keep the project's chosen check scope intact");
                expect(instructions).toContain('never replace it with a meaningless green result');
            }
        },
    );

    it('passes only when all selected stages actually exit successfully', async () => {
        const output = await runPromptCheckCommand({
            command: 'npm run check',
            projectPath,
            scriptPath: join(projectPath, 'pass.check.sh'),
        });
        for (const stage of ['lint', 'typecheck', 'build']) expect(output).toContain(`${stage} stdout`);
        expect(output).toContain('All tests passed!');
    });

    it('executes spaced arguments, embedded flags and intentional shell composition through the same runner', async () => {
        await writeFile(join(projectPath, 'check args.cjs'), 'console.log(JSON.stringify(process.argv.slice(2)));');
        const command = normalizeCheckCommandOption([
            'node',
            'check args.cjs',
            '--no-ui',
            'two words',
            '',
            '$LITERAL',
            'one;two',
            '`literal`',
            '&&',
            'echo',
            'composed',
        ])!;
        const output = await runPromptCheckCommand({
            command,
            projectPath,
            scriptPath: join(projectPath, 'quoted.check.sh'),
        });
        expect(output).toContain('["--no-ui","two words","","$LITERAL","one;two","`literal`"]');
        expect(output).toContain('composed');
    });

    it('keeps quoted npm examples in tool arguments out of project setup inspection', async () => {
        const output = await runPromptCheckCommand({
            command: `node -e "console.log('(npm run missing-validation)')"`,
            projectPath,
            scriptPath: join(projectPath, 'literal.check.sh'),
        });
        expect(output).toContain('(npm run missing-validation)');
    });

    it.each(['npm --prefix child run check', 'npm run check --prefix child'])(
        'executes package-manager directory overrides without inspecting root validation: %s',
        async (command) => {
            await mkdir(join(projectPath, 'child'));
            await writeFile(
                join(projectPath, 'child/package.json'),
                JSON.stringify({ scripts: { check: 'node ../stage.cjs build' } }),
            );
            await writeFile(join(projectPath, 'package.json'), JSON.stringify({ scripts: {} }));
            const output = await runPromptCheckCommand({
                command,
                projectPath,
                scriptPath: join(projectPath, 'prefix.check.sh'),
            });
            expect(output).toContain('build stdout');
        },
    );

    it.each([undefined, '', CHECK_SETUP_PLACEHOLDER_COMMAND])(
        'stops on a missing or unconfigured check without a repair loop: %s',
        async (check) => {
            await writeFile(join(projectPath, 'package.json'), JSON.stringify({ scripts: { check } }));
            await expect(runCheckBefore({ checkCommand: 'npm run check', projectPath })).rejects.toBeInstanceOf(
                CoderCheckSetupError,
            );
            const runPrompt = jest.fn().mockResolvedValue({ usage: UNCERTAIN_USAGE });
            await expect(
                runPromptWithCheckFeedback({
                    runner: { name: 'fixture', runPrompt },
                    prompt: 'Task',
                    projectPath,
                    scriptPath: join(projectPath, 'setup.sh'),
                    promptLabel: 'fixture',
                    checkCommand: 'npm run check',
                }),
            ).rejects.toBeInstanceOf(CoderCheckSetupError);
            expect(runPrompt).not.toHaveBeenCalled();
        },
    );

    it('rejects cancellation instead of reporting a successful check or retrying a repair', async () => {
        const controller = new AbortController();
        controller.abort(new Error('fixture cancelled'));
        await expect(
            runCheckBefore({ checkCommand: 'echo "All tests passed!"', projectPath, signal: controller.signal }),
        ).rejects.toThrow('fixture cancelled');
    });

    it.each([
        'npm run check -- --strict',
        'npm run lint && npm run check',
        'npm run "check"',
        '(npm run check)',
        'CI=1 npm run check',
        'env CI="two words" npm run check',
        'npm --silent run check',
        'npm run --silent check',
    ])('does not retry missing canonical validation with arguments or composition: %s', async (command) => {
        await writeFile(
            join(projectPath, 'package.json'),
            JSON.stringify({ scripts: { lint: 'node stage.cjs lint' } }),
        );
        const runPrompt = jest.fn();
        await expect(
            runPromptWithCheckFeedback({
                runner: { name: 'fixture', runPrompt },
                prompt: 'Task',
                projectPath,
                scriptPath: join(projectPath, 'setup.sh'),
                promptLabel: 'fixture',
                checkCommand: command,
            }),
        ).rejects.toBeInstanceOf(CoderCheckSetupError);
        expect(runPrompt).not.toHaveBeenCalled();
    });

    it.each(['test-for-ptbk-coder', 'check-for-ptbk-coder'])(
        'reports a stale caller of missing %s with actionable migration guidance',
        async (name) => {
            await expect(runCheckBefore({ checkCommand: `npm run ${name}`, projectPath })).rejects.toThrow(
                '--check "npm run check"',
            );
            const runPrompt = jest.fn();
            await expect(
                runPromptWithCheckFeedback({
                    runner: { name: 'fixture', runPrompt },
                    prompt: 'Task',
                    projectPath,
                    scriptPath: join(projectPath, 'stale.sh'),
                    promptLabel: 'fixture',
                    checkCommand: `npm run ${name}`,
                }),
            ).rejects.toBeInstanceOf(CoderCheckSetupError);
            expect(runPrompt).not.toHaveBeenCalled();
        },
    );

    it.each([
        'npm run missing-lint',
        'npm run lint && npm run missing-build',
        'npm test',
        'npm run missing-build && cd child && npm run check',
        'npm run missing-build && (cd child && npm run check)',
        `node -e "console.log('(cd child)')" && npm run missing-build`,
    ])('reports missing explicitly selected validation as setup without starting repairs: %s', async (command) => {
        await writeFile(
            join(projectPath, 'package.json'),
            JSON.stringify({ scripts: { lint: 'node stage.cjs lint' } }),
        );
        await expect(runCheckBefore({ checkCommand: command, projectPath })).rejects.toBeInstanceOf(
            CoderCheckSetupError,
        );
        const runPrompt = jest.fn();
        await expect(
            runPromptWithCheckFeedback({
                runner: { name: 'fixture', runPrompt },
                prompt: 'Task',
                projectPath,
                scriptPath: join(projectPath, 'missing-leaf.sh'),
                promptLabel: 'fixture',
                checkCommand: command,
            }),
        ).rejects.toBeInstanceOf(CoderCheckSetupError);
        expect(runPrompt).not.toHaveBeenCalled();
    });

    it.each(['check.release', 'check custom'])(
        'executes an explicit project-owned script %s without requiring an unrelated check script',
        async (name) => {
            await writeFile(
                join(projectPath, 'package.json'),
                JSON.stringify({ scripts: { [name]: 'node stage.cjs build' } }),
            );
            const output = await runPromptCheckCommand({
                command: `npm run "${name}"`,
                projectPath,
                scriptPath: join(projectPath, 'custom.check.sh'),
            });
            expect(output).toContain('build stdout');
        },
    );

    it('inspects complete referenced script names containing dots', async () => {
        await writeFile(
            join(projectPath, 'package.json'),
            JSON.stringify({
                scripts: { check: 'npm run "build.production"', 'build.production': 'node stage.cjs build' },
            }),
        );
        const output = await runPromptCheckCommand({
            command: 'npm run check',
            projectPath,
            scriptPath: join(projectPath, 'dotted.check.sh'),
        });
        expect(output).toContain('build stdout');
    });

    it.each(['(cd child && npm run check)', 'npm run check'])(
        'executes checks owned by a child workspace without inspecting root scripts: %s',
        async (command) => {
            await mkdir(join(projectPath, 'child'));
            await writeFile(
                join(projectPath, 'child/package.json'),
                JSON.stringify({ scripts: { check: 'node ../stage.cjs build' } }),
            );
            await writeFile(
                join(projectPath, 'package.json'),
                JSON.stringify({ scripts: { check: '(cd child && npm run check)' } }),
            );
            const output = await runPromptCheckCommand({
                command,
                projectPath,
                scriptPath: join(projectPath, 'workspace.check.sh'),
            });
            expect(output).toContain('build stdout');
        },
    );

    it.each([
        { check: 'npm test' },
        { check: 'npm test', test: 'echo "Error: no test specified" && exit 1' },
        { check: 'npm run lint', lint: 'npm run check' },
        { check: '(npm --silent run check)' },
        { check: 'npm run "lint project"', 'lint project': 'CI=1 npm run check' },
        { check: 'npm run validate', validate: 'ptbk coder run --harness openai-codex' },
        { check: 'ptbk coder fix' },
    ])('reports missing, unconfigured or recursive leaf validation as setup: %s', async (scripts) => {
        await writeFile(join(projectPath, 'package.json'), JSON.stringify({ scripts }));
        await expect(runCheckBefore({ checkCommand: 'npm run check', projectPath })).rejects.toBeInstanceOf(
            CoderCheckSetupError,
        );
    });
});
