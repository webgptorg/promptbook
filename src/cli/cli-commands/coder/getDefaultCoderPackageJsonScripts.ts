import { AGENTS_FILE_PATH } from './agentsFile';
import { DEFAULT_BOILERPLATE_COUNT_OPTION_VALUE } from './boilerplateCount';
import { COMMON_PROMPT_TEMPLATE_FILE_PATH } from './boilerplateTemplates';
import { CODER_DEVELOPER_AGENT_FILE_PATH } from './ensureCoderDeveloperAgentFile';
import { formatDisplayPath } from './formatDisplayPath';

/**
 * Canonical project-owned npm script executed by Coder for aggregate validation.
 *
 * @private internal utility of `coder init` command
 */
export const CODER_CHECK_SCRIPT_NAME = 'check';

/**
 * Legacy generated aggregate-validation script recognized during initialization migration.
 *
 * @private internal migration constant of `coder init` command
 */
const LEGACY_CODER_CHECK_SCRIPT_NAME = 'test-for-ptbk-coder';

/**
 * Failing setup marker used when a project has no conventional validation scripts to compose.
 *
 * @private internal default of `coder init` command
 */
const DEFAULT_CODER_CHECK_PLACEHOLDER_COMMAND =
    `node -e "console.error('Configure package.json scripts.check with the project validation command(s).'); process.exit(1)"`;

/**
 * Canonical initialized coder run script.
 *
 * @private internal default of `coder init` command
 */
const DEFAULT_CODER_RUN_SCRIPT_COMMAND =
    'npx ptbk coder run --harness openai-codex --thinking-level max --check "npm run check" --check-before yes-and-fix';

/**
 * Script forms generated before project defaults were shared by the CLI.
 *
 * @private internal migration constant of `coder init` command
 */
const LEGACY_GENERATED_CODER_RUN_SCRIPT_COMMANDS = new Set([
    `npx ptbk coder run --harness openai-codex --thinking-level max --test "npm run ${LEGACY_CODER_CHECK_SCRIPT_NAME}" --test-before yes-and-fix`,
    'npx ptbk coder run --harness openai-codex --thinking-level max --agent agents/developer.book --context AGENTS.md --test-before yes-and-fix',
]);

/**
 * Validation categories used only to explain deterministic generated check composition.
 *
 * @private internal type of `coder init` command
 */
type CoderValidationCategory = 'tests' | 'lint' | 'typechecking' | 'build' | 'other';

/**
 * One existing project script selected for the generated aggregate check.
 *
 * @private internal type of `coder init` command
 */
type CoderValidationScriptCandidate = {
    readonly scriptName: string;
    readonly category: CoderValidationCategory;
};

/**
 * One npm script initialized by `ptbk coder init`.
 */
type CoderPackageJsonScriptDefinition = {
    /**
     * Name of the npm script.
     */
    readonly scriptName: string;

    /**
     * Shell command of the npm script.
     */
    readonly scriptCommand: string;

    /**
     * Project-relative paths of the artifacts the command points at.
     *
     * Non-role artifacts are created with newly added scripts; role Books are always initialized when missing.
     */
    readonly referencedArtifactPaths: ReadonlyArray<string>;
};

/**
 * Default npm scripts initialized by `ptbk coder init`.
 *
 * Note: Using NPX because `ptbk` can be installed globally or locally, and NPX will resolve it correctly in either case.
 */
const DEFAULT_CODER_PACKAGE_JSON_SCRIPT_DEFINITIONS: ReadonlyArray<CoderPackageJsonScriptDefinition> = [
    {
        scriptName: 'coder:generate-boilerplates',
        scriptCommand: `npx ptbk coder generate-boilerplates --count ${DEFAULT_BOILERPLATE_COUNT_OPTION_VALUE} --template ${formatCoderScriptFilePath(
            COMMON_PROMPT_TEMPLATE_FILE_PATH,
        )}`,
        referencedArtifactPaths: [COMMON_PROMPT_TEMPLATE_FILE_PATH],
    },
    {
        scriptName: 'coder:add',
        scriptCommand: `npx ptbk coder add --template ${formatCoderScriptFilePath(COMMON_PROMPT_TEMPLATE_FILE_PATH)}`,
        referencedArtifactPaths: [COMMON_PROMPT_TEMPLATE_FILE_PATH],
    },
    {
        scriptName: 'coder:plan',
        scriptCommand: 'npx ptbk coder plan --harness openai-codex',
        referencedArtifactPaths: [CODER_DEVELOPER_AGENT_FILE_PATH, AGENTS_FILE_PATH, COMMON_PROMPT_TEMPLATE_FILE_PATH],
    },
    {
        scriptName: 'coder:run',
        scriptCommand: DEFAULT_CODER_RUN_SCRIPT_COMMAND,
        referencedArtifactPaths: [CODER_DEVELOPER_AGENT_FILE_PATH, AGENTS_FILE_PATH],
    },
    // { scriptName: 'coder:find-refactor-candidates', scriptCommand: 'npx ptbk coder find-refactor-candidates', referencedArtifactPaths: [] },
    {
        scriptName: 'coder:verify',
        scriptCommand: 'npx ptbk coder verify',
        referencedArtifactPaths: [],
    },
    {
        // Note: The aggregate check of `coder:run` is project-owned, so every project can decide
        //       what validation means without touching the `coder:run` script itself.
        scriptName: CODER_CHECK_SCRIPT_NAME,
        scriptCommand: DEFAULT_CODER_CHECK_PLACEHOLDER_COMMAND,
        referencedArtifactPaths: [],
    },
];

/**
 * Lists the default npm scripts initialized by `ptbk coder init`.
 *
 * @private internal utility of `coder init` command
 */
export function getDefaultCoderPackageJsonScripts(): Readonly<Record<string, string>> {
    return Object.fromEntries(
        DEFAULT_CODER_PACKAGE_JSON_SCRIPT_DEFINITIONS.map(({ scriptName, scriptCommand }) => [
            scriptName,
            scriptCommand,
        ]),
    );
}

/**
 * Resolves the project-owned `scripts.check` entry and migrates only recognized generated callers.
 *
 * Existing `scripts.check` values are never changed. A legacy aggregate is moved to `check` only when
 * there is no existing `check`; the legacy entry is removed only after its command body is preserved and
 * no remaining script still calls it.
 *
 * @private internal utility of `coder init` command
 */
export function resolveCoderPackageJsonScriptsForInitialization(
    existingEntries: Readonly<Record<string, string>>,
): {
    readonly entries: Readonly<Record<string, string>>;
    readonly diagnostics: ReadonlyArray<string>;
} {
    const entries: Record<string, string> = { ...existingEntries };
    const diagnostics: Array<string> = [];
    const legacyCheckCommand = entries[LEGACY_CODER_CHECK_SCRIPT_NAME];
    const existingCheckCommand = entries[CODER_CHECK_SCRIPT_NAME];

    if (existingCheckCommand !== undefined) {
        diagnostics.push(
            'Preserved the existing `scripts.check` command exactly; Coder will execute that project-owned aggregate without adding hidden checks.',
        );
    } else if (legacyCheckCommand !== undefined) {
        entries[CODER_CHECK_SCRIPT_NAME] = legacyCheckCommand;
        diagnostics.push(
            `Migrated the existing legacy \`${LEGACY_CODER_CHECK_SCRIPT_NAME}\` command to \`scripts.check\` without changing its body.`,
        );
    } else {
        const composition = composeCoderCheckCommand(existingEntries);
        entries[CODER_CHECK_SCRIPT_NAME] = composition.command;
        diagnostics.push(composition.diagnostic);
    }

    if (entries['coder:run'] !== undefined && isLegacyGeneratedCoderRunScript(entries['coder:run'])) {
        entries['coder:run'] = DEFAULT_CODER_RUN_SCRIPT_COMMAND;
        diagnostics.push('Updated the unchanged generated `coder:run` caller to `--check "npm run check"`.');
    }

    const legacyFlagCallers = Object.entries(entries)
        .filter(([, scriptCommand]) => usesRemovedCoderCheckFlags(scriptCommand))
        .map(([scriptName]) => scriptName);
    if (legacyFlagCallers.length > 0) {
        diagnostics.push(
            `Kept custom Coder script caller(s) with removed aggregate flags (${legacyFlagCallers.join(
                ', ',
            )}); update them manually to \`--check\` and \`--check-before\` before the legacy spelling is removed.`,
        );
    }

    if (legacyCheckCommand !== undefined) {
        const hasLegacyCaller = Object.entries(entries).some(
            ([scriptName, scriptCommand]) =>
                scriptName !== LEGACY_CODER_CHECK_SCRIPT_NAME &&
                containsNpmScriptReference(scriptCommand, LEGACY_CODER_CHECK_SCRIPT_NAME),
        );
        const isExistingCheckConflict =
            existingCheckCommand !== undefined && existingCheckCommand !== legacyCheckCommand;

        if (isExistingCheckConflict) {
            diagnostics.push(
                `Kept both \`${CODER_CHECK_SCRIPT_NAME}\` and customized legacy \`${LEGACY_CODER_CHECK_SCRIPT_NAME}\` because their command bodies differ; remove the legacy entry after updating any callers.`,
            );
        }

        if (hasLegacyCaller) {
            diagnostics.push(
                `Kept \`${LEGACY_CODER_CHECK_SCRIPT_NAME}\` because another project script still calls it; update that caller to \`npm run check\` before removing the legacy entry.`,
            );
        }

        if (!isExistingCheckConflict && !hasLegacyCaller) {
            delete entries[LEGACY_CODER_CHECK_SCRIPT_NAME];
            diagnostics.push(`Removed the obsolete \`${LEGACY_CODER_CHECK_SCRIPT_NAME}\` entry after migrating it to \`check\`.`);
        }
    }

    return { entries, diagnostics };
}

/**
 * Collects the project-relative artifact paths referenced by the given default coder scripts.
 *
 * @private internal utility of `coder init` command
 */
export function resolveCoderPackageJsonScriptReferencedArtifactPaths(
    scriptNames: ReadonlyArray<string>,
): ReadonlySet<string> {
    return new Set(
        DEFAULT_CODER_PACKAGE_JSON_SCRIPT_DEFINITIONS.filter(({ scriptName }) => scriptNames.includes(scriptName))
            .map(({ referencedArtifactPaths }) => referencedArtifactPaths)
            .flat(),
    );
}

/**
 * Builds a deterministic aggregate command from conventional project-owned validation scripts.
 */
function composeCoderCheckCommand(existingEntries: Readonly<Record<string, string>>): {
    readonly command: string;
    readonly diagnostic: string;
} {
    const candidates = Object.keys(existingEntries)
        .map((scriptName) => ({ scriptName, category: getCoderValidationCategory(scriptName) }))
        .filter((candidate): candidate is CoderValidationScriptCandidate => candidate.category !== undefined)
        .filter(({ scriptName }) => !isUnsafeCoderValidationScript(scriptName, existingEntries))
        .filter(({ scriptName }) => !leadsToCoderWorkflow(scriptName, existingEntries, new Set()))
        .sort((left, right) => {
            const categoryOrder: ReadonlyArray<CoderValidationCategory> = [
                'tests',
                'lint',
                'typechecking',
                'build',
                'other',
            ];
            const categoryDifference = categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category);
            return categoryDifference !== 0 ? categoryDifference : left.scriptName.localeCompare(right.scriptName);
        });

    if (candidates.length === 0) {
        return {
            command: DEFAULT_CODER_CHECK_PLACEHOLDER_COMMAND,
            diagnostic:
                'No usable conventional validation scripts were found. Created a failing `scripts.check` setup placeholder; configure it with the project checks before running Coder.',
        };
    }

    const command = candidates.map(({ scriptName }) => `npm run ${scriptName}`).join(' && ');
    const composition = candidates
        .map(({ scriptName, category }) => `${category} (npm run ${scriptName})`)
        .join(', ');

    return {
        command,
        diagnostic: `Generated \`scripts.check\` from existing validation scripts: ${composition}.`,
    };
}

/**
 * Maps a conventional npm script name to the validation category shown in initialization diagnostics.
 */
function getCoderValidationCategory(scriptName: string): CoderValidationCategory | undefined {
    const normalizedScriptName = scriptName.toLowerCase();

    if (
        normalizedScriptName === 'test' ||
        normalizedScriptName.startsWith('test:') ||
        normalizedScriptName.startsWith('test-')
    ) {
        return 'tests';
    }

    if (
        normalizedScriptName === 'lint' ||
        normalizedScriptName.startsWith('lint:') ||
        normalizedScriptName.startsWith('lint-')
    ) {
        return 'lint';
    }

    if (
        ['typecheck', 'type-check', 'typechecking', 'types', 'test-types'].includes(normalizedScriptName) ||
        normalizedScriptName.startsWith('typecheck:') ||
        normalizedScriptName.startsWith('typecheck-') ||
        normalizedScriptName.startsWith('type-check:') ||
        normalizedScriptName.startsWith('type-check-')
    ) {
        return 'typechecking';
    }

    if (
        normalizedScriptName === 'build' ||
        normalizedScriptName.startsWith('build:') ||
        normalizedScriptName.startsWith('build-')
    ) {
        return 'build';
    }

    if (
        normalizedScriptName === 'validate' ||
        normalizedScriptName === 'verify' ||
        normalizedScriptName === 'format:check' ||
        normalizedScriptName === 'format-check' ||
        normalizedScriptName === 'spellcheck' ||
        normalizedScriptName === 'spell-check'
    ) {
        return 'other';
    }

    return undefined;
}

/**
 * Excludes scripts which are unsafe or not intended as non-interactive project validation.
 */
function isUnsafeCoderValidationScript(
    scriptName: string,
    existingEntries: Readonly<Record<string, string>>,
): boolean {
    const normalizedScriptName = scriptName.toLowerCase();
    if (
        normalizedScriptName === CODER_CHECK_SCRIPT_NAME ||
        normalizedScriptName === LEGACY_CODER_CHECK_SCRIPT_NAME ||
        normalizedScriptName.startsWith('coder:') ||
        [
            'fix',
            'coder:fix',
            'install',
            'uninstall',
            'postinstall',
            'preinstall',
            'prepare',
            'prepublish',
            'publish',
            'release',
        ].includes(normalizedScriptName)
    ) {
        return true;
    }

    if (
        /(^|[-_:])(watch|dev|start|deploy|install|uninstall|publish|release|reset|destroy|clean)(?:$|[-_:])/u.test(
            normalizedScriptName,
        )
    ) {
        return true;
    }

    return /\b(?:npm|pnpm|yarn)\s+(?:run\s+)?(?:watch|dev|start|deploy|install|uninstall|publish|release|reset|destroy|clean)\b/iu.test(
        existingEntries[scriptName] ?? '',
    );
}

/**
 * Detects a validation script which eventually invokes a Coder workflow or the aggregate check itself.
 */
function leadsToCoderWorkflow(
    scriptName: string,
    existingEntries: Readonly<Record<string, string>>,
    visitedScriptNames: ReadonlySet<string>,
): boolean {
    if (visitedScriptNames.has(scriptName)) {
        return true;
    }

    const scriptCommand = existingEntries[scriptName] ?? '';
    if (/\b(?:ptbk|npx\s+ptbk)\s+coder\s+(?:run|fix)\b/iu.test(scriptCommand)) {
        return true;
    }

    const nextVisitedScriptNames = new Set(visitedScriptNames).add(scriptName);
    return getNpmScriptReferences(scriptCommand).some((referencedScriptName) => {
        if (
            referencedScriptName === CODER_CHECK_SCRIPT_NAME ||
            referencedScriptName === LEGACY_CODER_CHECK_SCRIPT_NAME ||
            referencedScriptName === 'fix' ||
            referencedScriptName.startsWith('coder:')
        ) {
            return true;
        }

        return Object.prototype.hasOwnProperty.call(existingEntries, referencedScriptName)
            ? leadsToCoderWorkflow(referencedScriptName, existingEntries, nextVisitedScriptNames)
            : false;
    });
}

/**
 * Lists npm script references used to detect recursive generated validation definitions.
 */
function getNpmScriptReferences(scriptCommand: string): ReadonlyArray<string> {
    return [...scriptCommand.matchAll(/\b(?:npm|pnpm|yarn)\s+(?:run\s+)?([A-Za-z0-9:_-]+)/gu)].map(
        ([, scriptName]) => scriptName!,
    );
}

/**
 * Checks whether a script calls one named npm script.
 */
function containsNpmScriptReference(scriptCommand: string, scriptName: string): boolean {
    return getNpmScriptReferences(scriptCommand).includes(scriptName);
}

/**
 * Recognizes only the generated `coder:run` forms whose aggregate flags and defaults are safe to migrate.
 */
function isLegacyGeneratedCoderRunScript(scriptCommand: string): boolean {
    const normalizedScriptCommand = scriptCommand.trim().replace(/\s+/gu, ' ');
    return LEGACY_GENERATED_CODER_RUN_SCRIPT_COMMANDS.has(normalizedScriptCommand);
}

/**
 * Detects a custom Coder command whose old aggregate flags are not safe to rewrite automatically.
 */
function usesRemovedCoderCheckFlags(scriptCommand: string): boolean {
    return (
        /\b(?:ptbk|npx\s+ptbk)\s+coder\s+(?:run|server)\b/iu.test(scriptCommand) &&
        /--test(?:-before)?(?:\s|=|$)/u.test(scriptCommand)
    );
}

/**
 * Formats one project-relative path as an explicitly project-rooted path usable inside a shell command.
 */
function formatCoderScriptFilePath(relativeFilePath: string): string {
    return `./${formatDisplayPath(relativeFilePath)}`;
}

// Note: [🟡] Code for coder init package scripts [getDefaultCoderPackageJsonScripts](src/cli/cli-commands/coder/getDefaultCoderPackageJsonScripts.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
