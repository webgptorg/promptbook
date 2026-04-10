/**
 * Default npm scripts initialized by `ptbk coder init`.
 */
const DEFAULT_CODER_PACKAGE_JSON_SCRIPTS = {
    'coder:generate-boilerplates': 'npx ptbk coder generate-boilerplates',
    'coder:run': 'npx ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md --no-wait',
    'coder:find-refactor-candidates': 'npx ptbk coder find-refactor-candidates',
    'coder:verify': 'npx ptbk coder verify',
} as const satisfies Readonly<Record<string, string>>;

/**
 * Lists the default npm scripts initialized by `ptbk coder init`.
 *
 * @private internal utility of `coder init` command
 */
export function getDefaultCoderPackageJsonScripts(): Readonly<Record<string, string>> {
    return DEFAULT_CODER_PACKAGE_JSON_SCRIPTS;
}

// Note: [🟡] Code for coder init package scripts [getDefaultCoderPackageJsonScripts](src/cli/cli-commands/coder/getDefaultCoderPackageJsonScripts.ts) should never be published outside of `@promptbook/cli`
