import { DEFAULT_BOILERPLATE_COUNT_OPTION_VALUE } from './boilerplateCount';

/**
 * Default npm scripts initialized by `ptbk coder init`.
 */
const DEFAULT_CODER_PACKAGE_JSON_SCRIPTS = {
    'coder:generate-boilerplates': `ptbk coder generate-boilerplates --count ${DEFAULT_BOILERPLATE_COUNT_OPTION_VALUE} --template ./prompts/templates/common.md`,
    'coder:add': 'ptbk coder add --template ./prompts/templates/common.md',
    'coder:run':
        'ptbk coder run --harness openai-codex --model gpt-5.6-terra --thinking-level max --agent agents/developer.book --context AGENTS.md --test-before yes-and-fix',
    // 'coder:find-refactor-candidates': 'npx ptbk coder find-refactor-candidates',
    'coder:verify': 'ptbk coder verify',
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
