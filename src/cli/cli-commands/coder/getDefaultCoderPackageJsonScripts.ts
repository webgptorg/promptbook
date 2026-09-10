import { AGENTS_FILE_PATH } from './agentsFile';
import { DEFAULT_BOILERPLATE_COUNT_OPTION_VALUE } from './boilerplateCount';
import { COMMON_PROMPT_TEMPLATE_FILE_PATH } from './boilerplateTemplates';
import { CODER_DEVELOPER_AGENT_FILE_PATH } from './ensureCoderDeveloperAgentFile';
import { formatDisplayPath } from './formatDisplayPath';

/**
 * Name of the npm script which `ptbk coder run` uses to verify the project.
 */
const CODER_TEST_SCRIPT_NAME = 'test-for-ptbk-coder';

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
     * They are created only together with the script itself, never for a script the project already defines.
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
        scriptName: 'coder:run',
        scriptCommand: [
            'npx ptbk coder run --harness openai-codex --model gpt-5.6-terra --thinking-level max',
            `--agent ${formatDisplayPath(CODER_DEVELOPER_AGENT_FILE_PATH)}`,
            `--context ${formatDisplayPath(AGENTS_FILE_PATH)}`,
            `--test "npm run ${CODER_TEST_SCRIPT_NAME}" --test-before yes-and-fix`,
        ].join(' '),
        referencedArtifactPaths: [CODER_DEVELOPER_AGENT_FILE_PATH, AGENTS_FILE_PATH],
    },
    // { scriptName: 'coder:find-refactor-candidates', scriptCommand: 'npx ptbk coder find-refactor-candidates', referencedArtifactPaths: [] },
    {
        scriptName: 'coder:verify',
        scriptCommand: 'npx ptbk coder verify',
        referencedArtifactPaths: [],
    },
    {
        // Note: The verification command of `coder:run` is a project-owned script, so every project can decide
        //       what "verified" means without touching the `coder:run` script itself
        scriptName: CODER_TEST_SCRIPT_NAME,
        scriptCommand: 'npm test',
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
 * Formats one project-relative path as an explicitly project-rooted path usable inside a shell command.
 */
function formatCoderScriptFilePath(relativeFilePath: string): string {
    return `./${formatDisplayPath(relativeFilePath)}`;
}

// Note: [🟡] Code for coder init package scripts [getDefaultCoderPackageJsonScripts](src/cli/cli-commands/coder/getDefaultCoderPackageJsonScripts.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
