import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { CHECK_SETUP_PLACEHOLDER_COMMAND } from '../../../../scripts/run-codex-prompts/checks/projectCheck';
import { ensureCoderPackageJsonFile } from './ensureCoderPackageJsonFile';
import { getDefaultCoderPackageJsonScripts } from './getDefaultCoderPackageJsonScripts';
import { prepareCoderPackageJsonScripts } from './prepareCoderPackageJsonScripts';

// cspell:ignore precheck postcheck posttest Jenkinsfile Procfile

/** Recognized unchanged initialized caller used by migration fixtures. */
const LEGACY_CODER_RUN =
    'npx ptbk coder run --harness openai-codex --thinking-level max --test "npm run test-for-ptbk-coder" --test-before yes-and-fix';

describe('project-owned check initialization and migration', () => {
    it('composes only the validation categories actually available, deterministically', () => {
        const result = prepareCoderPackageJsonScripts({
            lint: 'eslint .',
            typecheck: 'tsc --noEmit',
            build: 'vite build',
            test: 'jest',
        });
        expect(result.scripts.check).toBe('npm run lint && npm run typecheck && npm run build && npm test');
        expect(result.checkScriptSummary).toContain('lint, typecheck, build, test');
        expect(prepareCoderPackageJsonScripts({ lint: 'eslint .' }).scripts.check).toBe('npm run lint');
        expect(prepareCoderPackageJsonScripts({ test: 'npm run lint && jest', lint: 'eslint .' }).scripts.check).toBe(
            'npm test',
        );
        expect(
            prepareCoderPackageJsonScripts({ 'test-unit': 'jest unit', 'test-integration': 'jest integration' }).scripts
                .check,
        ).toBe('npm run test-unit && npm run test-integration');
    });

    it('preserves a custom check and its chosen validation scope exactly', () => {
        const result = prepareCoderPackageJsonScripts({
            check: '  npm run typecheck -- --pretty false  ',
            lint: 'eslint .',
            build: 'vite build',
            typecheck: 'tsc --noEmit',
        });
        expect(result.scripts.check).toBe('  npm run typecheck -- --pretty false  ');
        expect(prepareCoderPackageJsonScripts({ check: LEGACY_CODER_RUN }).scripts.check).toBe(LEGACY_CODER_RUN);
    });

    it('includes conventional check-types validation without recursively including check itself', () => {
        const result = prepareCoderPackageJsonScripts({ 'check-types': 'tsc --noEmit', test: 'jest' });
        expect(result.scripts.check).toBe('npm run check-types && npm test');
        expect(result.isCheckConfigured).toBe(true);
        expect(
            prepareCoderPackageJsonScripts({ typecheck: 'npm run check-types', 'check-types': 'tsc --noEmit' }).scripts
                .check,
        ).toBe('npm run typecheck');
        expect(prepareCoderPackageJsonScripts({ 'check-types': 'npm run check' }).scripts.check).toBe(
            CHECK_SETUP_PLACEHOLDER_COMMAND,
        );
    });

    it.each<Readonly<Record<string, string>>>([
        { check: 'npm run missing-validation' },
        { check: '(npm run check)' },
        { check: 'npm --silent run lint', lint: 'CI=1 npm run check' },
    ])('preserves a project check needing setup and reports the problem: %s', (scripts) => {
        const result = prepareCoderPackageJsonScripts(scripts);
        expect(result.scripts.check).toBe(scripts.check);
        expect(result.isCheckConfigured).toBe(false);
        expect(result.checkScriptSummary).toContain('Additional setup required');
    });

    it('preserves legacy lifecycle validation when migrating the canonical script', () => {
        const original = {
            'test-for-ptbk-coder': 'npm test',
            'pretest-for-ptbk-coder': 'npm run lint',
            'posttest-for-ptbk-coder': 'npm run build',
            'coder:run': LEGACY_CODER_RUN,
            test: 'jest',
            lint: 'eslint .',
            build: 'tsc',
        };
        const result = prepareCoderPackageJsonScripts(original);
        expect(result.scripts.check).toBe('npm test');
        expect(result.scripts.precheck).toBe('npm run lint');
        expect(result.scripts.postcheck).toBe('npm run build');
        expect(result.scripts['test-for-ptbk-coder']).toBeUndefined();
        expect(result.scripts['pretest-for-ptbk-coder']).toBeUndefined();
        expect(result.scripts['posttest-for-ptbk-coder']).toBeUndefined();
        expect(result.scripts['coder:run']).toBe(getDefaultCoderPackageJsonScripts()['coder:run']);
        expect(prepareCoderPackageJsonScripts(result.scripts).scripts).toEqual(result.scripts);
    });

    it.each([false, true])('keeps conflicting lifecycle scopes intact (existing check: %s)', (isExistingCheck) => {
        const original = {
            ...(isExistingCheck ? { check: 'npm test' } : {}),
            'test-for-ptbk-coder': 'npm test',
            'pretest-for-ptbk-coder': 'npm run lint',
            precheck: 'npm run typecheck',
            'coder:run': LEGACY_CODER_RUN,
        };
        const result = prepareCoderPackageJsonScripts(original);
        expect(result.scripts.check).toBe(isExistingCheck ? 'npm test' : CHECK_SETUP_PLACEHOLDER_COMMAND);
        expect(result.scripts.precheck).toBe(original.precheck);
        expect(result.scripts['test-for-ptbk-coder']).toBe('npm test');
        expect(result.scripts['pretest-for-ptbk-coder']).toBe(original['pretest-for-ptbk-coder']);
        expect(result.scripts['coder:run']).toBe(LEGACY_CODER_RUN);
        expect(result.migrationInstructions.join()).toContain('npm lifecycle hooks differ');
    });

    it.each(['npm test', 'npm run lint && npm run build && npm test'])(
        'preserves the legacy command body %s during migration',
        (body) => {
            const result = prepareCoderPackageJsonScripts({
                'test-for-ptbk-coder': body,
                'coder:run': LEGACY_CODER_RUN,
            });
            expect(result.scripts.check).toBe(body);
            expect(result.scripts['test-for-ptbk-coder']).toBeUndefined();
            expect(result.scripts['coder:run']).toBe(getDefaultCoderPackageJsonScripts()['coder:run']);
            expect(result.migrationInstructions).toEqual([]);
        },
    );

    it('does not add unrelated existing check lifecycle hooks to a migrated validation command', () => {
        const original = {
            'test-for-ptbk-coder': 'npm run lint && npm test',
            precheck: 'npm run deploy',
            'coder:run': LEGACY_CODER_RUN,
            test: 'jest',
            lint: 'eslint .',
            deploy: 'node deploy.cjs',
        };
        const result = prepareCoderPackageJsonScripts(original);
        expect(result.scripts.check).toBe(CHECK_SETUP_PLACEHOLDER_COMMAND);
        expect(result.scripts['test-for-ptbk-coder']).toBe(original['test-for-ptbk-coder']);
        expect(result.scripts.precheck).toBe(original.precheck);
        expect(result.scripts['coder:run']).toBe(LEGACY_CODER_RUN);
        expect(result.isCheckConfigured).toBe(false);
        expect(result.migrationInstructions.join()).toContain('npm lifecycle hooks differ');
    });

    it('migrates the generated explicit agent/context caller to shared defaults', () => {
        const result = prepareCoderPackageJsonScripts({
            test: 'jest',
            'coder:run':
                'npx ptbk coder run --harness openai-codex --thinking-level max --agent agents/developer.book --context AGENTS.md --test-before yes-and-fix',
        });
        expect(result.scripts['coder:run']).toBe(getDefaultCoderPackageJsonScripts()['coder:run']);
        expect(result.scripts.check).toBe('npm test');
    });

    it('preserves conflicting checks and custom legacy callers with precise migration guidance', () => {
        const result = prepareCoderPackageJsonScripts({
            check: 'npm run typecheck',
            'test-for-ptbk-coder': 'npm run lint && npm test',
            'coder:run': LEGACY_CODER_RUN,
            ci: 'npm run test-for-ptbk-coder && echo reviewed',
        });
        expect(result.scripts.check).toBe('npm run typecheck');
        expect(result.scripts['test-for-ptbk-coder']).toBe('npm run lint && npm test');
        expect(result.scripts['coder:run']).toBe(LEGACY_CODER_RUN);
        expect(result.scripts.ci).toBe('npm run test-for-ptbk-coder && echo reviewed');
        expect(result.migrationInstructions.join('\n')).toContain('scripts.ci');
        expect(result.migrationInstructions.join('\n')).toContain('--check-before');
    });

    it('keeps a legacy entry while other callers still reference it', () => {
        const result = prepareCoderPackageJsonScripts({
            'test-for-ptbk-coder': 'npm test',
            'coder:run': LEGACY_CODER_RUN,
            ci: 'npm run test-for-ptbk-coder',
        });
        expect(result.scripts['test-for-ptbk-coder']).toBe('npm test');
        expect(result.scripts.ci).toBe('npm run test-for-ptbk-coder');
        expect(result.migrationInstructions.join()).toContain('scripts.ci');
    });

    it('preserves differing legacy aggregates and a caller whose scope cannot be migrated safely', () => {
        const caller = LEGACY_CODER_RUN.replace('test-for-ptbk-coder', 'check-for-ptbk-coder');
        const result = prepareCoderPackageJsonScripts({
            'test-for-ptbk-coder': 'npm test',
            'check-for-ptbk-coder': 'npm run lint && npm test',
            'coder:run': caller,
        });
        expect(result.scripts.check).toBe('npm test');
        expect(result.scripts['check-for-ptbk-coder']).toBe('npm run lint && npm test');
        expect(result.scripts['coder:run']).toBe(caller);
        expect(result.migrationInstructions.join()).toContain('scripts.coder:run');
    });

    it('preserves unknown shell expressions instead of guessing at a rewrite', () => {
        const caller =
            'MODE=ci npx ptbk coder run --harness claude-code --test "$VALIDATION" --test-before yes-and-fix';
        const result = prepareCoderPackageJsonScripts({ 'coder:run': caller });
        expect(result.scripts['coder:run']).toBe(caller);
        expect(result.migrationInstructions.join()).toContain('Existing command was preserved');
    });

    it.each<Readonly<Record<string, string>>>([
        {},
        { test: 'echo "Error: no test specified" && exit 1' },
        { test: 'jest --watch', build: 'vite dev', lint: 'npm run deploy', deploy: 'node deploy.cjs' },
        { test: 'npm run check', lint: 'npm run coder:run', 'coder:run': LEGACY_CODER_RUN },
        { test: 'npm run intermediate', intermediate: 'npm run test' },
        { test: 'jest', pretest: 'npm run coder:fix', 'coder:fix': 'ptbk coder fix' },
        { lint: 'npm run "check"', build: 'npm run reset', reset: 'rm -rf dist' },
        { test: 'npm test --if-present', build: 'next start' },
        { test: 'npm run --silent check', lint: 'yarn check', build: 'vite' },
        { test: 'jest', precheck: 'npm run deploy', deploy: 'node deploy.cjs' },
        { test: 'true', lint: 'echo lint && echo success', build: 'node -e "process.exit(0)"' },
    ])('creates a failing setup placeholder for unsuitable or recursive validation: %s', (scripts) => {
        const result = prepareCoderPackageJsonScripts(scripts);
        expect(result.scripts.check).toBe(CHECK_SETUP_PLACEHOLDER_COMMAND);
        expect(result.isCheckConfigured).toBe(false);
    });

    it('keeps recursion-prone legacy data and asks for project-owner setup', () => {
        const result = prepareCoderPackageJsonScripts({ 'test-for-ptbk-coder': 'npm run check' });
        expect(result.scripts.check).toBe(CHECK_SETUP_PLACEHOLDER_COMMAND);
        expect(result.scripts['test-for-ptbk-coder']).toBe('npm run check');
    });

    it.each<Readonly<Record<string, string>>>([
        { 'test-for-ptbk-coder': 'npm test', test: 'jest', pretest: 'npm run check' },
        { 'test-for-ptbk-coder': 'npm test', test: 'jest', posttest: 'npm run test-for-ptbk-coder' },
        { 'test-for-ptbk-coder': 'npm run validate', validate: 'npx ptbk coder run --harness openai-codex' },
        { 'test-for-ptbk-coder': 'ptbk coder fix' },
        { 'test-for-ptbk-coder': '(npm run check)' },
        { 'test-for-ptbk-coder': 'CI=1 npm --silent run check' },
    ])('does not migrate recursive lifecycle hooks or direct Coder calls into check: %s', (scripts) => {
        const result = prepareCoderPackageJsonScripts(scripts);
        expect(result.scripts.check).toBe(CHECK_SETUP_PLACEHOLDER_COMMAND);
        expect(result.scripts['test-for-ptbk-coder']).toBe(scripts['test-for-ptbk-coder']);
        expect(result.isCheckConfigured).toBe(false);
    });

    it('writes only canonical generated entries and is idempotent after migration', async () => {
        const projectPath = await mkdtemp(join(tmpdir(), 'ptbk check init '));
        try {
            const packagePath = join(projectPath, 'package.json');
            await writeFile(
                packagePath,
                JSON.stringify(
                    {
                        name: 'fixture',
                        scripts: { 'test-for-ptbk-coder': 'npm run lint && npm test', 'coder:run': LEGACY_CODER_RUN },
                    },
                    null,
                    2,
                ),
            );
            const result = await ensureCoderPackageJsonFile(projectPath);
            const first = await readFile(packagePath, 'utf-8');
            const scripts = JSON.parse(first).scripts;
            expect(scripts.check).toBe('npm run lint && npm test');
            expect(scripts['coder:run']).toContain('--check "npm run check" --check-before yes-and-fix');
            expect(scripts['test-for-ptbk-coder']).toBeUndefined();
            expect(scripts['check-for-ptbk-coder']).toBeUndefined();
            expect(result.addedEntryKeys).toContain('check');
            expect((await ensureCoderPackageJsonFile(projectPath)).status).toBe('unchanged');
            expect(await readFile(packagePath, 'utf-8')).toBe(first);
        } finally {
            await rm(projectPath, { recursive: true, force: true });
        }
    });

    it.each(['verify.py', 'Jenkinsfile', 'package.json'])(
        'preserves legacy validation referenced outside npm scripts by %s',
        async (callerPath) => {
            const projectPath = await mkdtemp(join(tmpdir(), 'ptbk custom check caller '));
            try {
                const metadata = {
                    ...(callerPath === 'package.json' ? { verificationScript: 'test-for-ptbk-coder' } : {}),
                    scripts: { 'test-for-ptbk-coder': 'npm test', 'coder:run': LEGACY_CODER_RUN, test: 'jest' },
                };
                await writeFile(join(projectPath, 'package.json'), JSON.stringify(metadata));
                if (callerPath !== 'package.json') {
                    await writeFile(join(projectPath, callerPath), 'npm run test-for-ptbk-coder');
                }
                const summary = await ensureCoderPackageJsonFile(projectPath);
                const result = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'));
                expect(result.scripts['test-for-ptbk-coder']).toBe('npm test');
                expect(result.scripts.check).toBe('npm test');
                expect(summary.migrationInstructions.join()).toContain(callerPath);
                if (callerPath === 'package.json') expect(result.verificationScript).toBe(metadata.verificationScript);
            } finally {
                await rm(projectPath, { recursive: true, force: true });
            }
        },
    );

    it('preserves legacy entries used by an external workflow and reports its exact path', async () => {
        const projectPath = await mkdtemp(join(tmpdir(), 'ptbk external check caller '));
        try {
            await mkdir(join(projectPath, '.github/workflows'), { recursive: true });
            await writeFile(
                join(projectPath, '.github/workflows/ci.yml'),
                'steps:\n  - run: npm run test-for-ptbk-coder\n',
            );
            await writeFile(
                join(projectPath, 'package.json'),
                JSON.stringify({ scripts: { 'test-for-ptbk-coder': 'npm test', 'coder:run': LEGACY_CODER_RUN } }),
            );
            const summary = await ensureCoderPackageJsonFile(projectPath);
            expect(
                JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8')).scripts['test-for-ptbk-coder'],
            ).toBe('npm test');
            expect(summary.migrationInstructions.join()).toContain('.github/workflows/ci.yml');
            expect(await readFile(join(projectPath, '.github/workflows/ci.yml'), 'utf-8')).toBe(
                'steps:\n  - run: npm run test-for-ptbk-coder\n',
            );
        } finally {
            await rm(projectPath, { recursive: true, force: true });
        }
    });

    it.each(['tools/done/verify.sh', 'tools/traces/verify.ps1'])(
        'preserves an active caller in a directory whose name also appears in Coder history: %s',
        async (callerPath) => {
            const projectPath = await mkdtemp(join(tmpdir(), 'ptbk maintained check caller '));
            try {
                await mkdir(join(projectPath, callerPath, '..'), { recursive: true });
                await writeFile(join(projectPath, callerPath), 'npm run test-for-ptbk-coder');
                await writeFile(
                    join(projectPath, 'package.json'),
                    JSON.stringify({ scripts: { 'test-for-ptbk-coder': 'npm test', 'coder:run': LEGACY_CODER_RUN } }),
                );
                const result = await ensureCoderPackageJsonFile(projectPath);
                const scripts = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8')).scripts;
                expect(scripts['test-for-ptbk-coder']).toBe('npm test');
                expect(scripts.check).toBe('npm test');
                expect(result.migrationInstructions.join()).toContain(callerPath);
                expect(await readFile(join(projectPath, callerPath), 'utf-8')).toBe('npm run test-for-ptbk-coder');
            } finally {
                await rm(projectPath, { recursive: true, force: true });
            }
        },
    );
});
