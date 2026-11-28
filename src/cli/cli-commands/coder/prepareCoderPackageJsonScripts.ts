import {
    assertProjectCheckScriptsAreConfigured,
    CHECK_SETUP_PLACEHOLDER_COMMAND,
    CoderCheckSetupError,
    isCheckSetupRequired,
} from '../../../../scripts/run-codex-prompts/checks/projectCheck';
import { getDefaultCoderPackageJsonScripts } from './getDefaultCoderPackageJsonScripts';
import { projectScriptReferences } from '../../../../scripts/run-codex-prompts/checks/projectScriptReferences';

/** Old initialized aggregate entries, used only at this migration boundary. */
const LEGACY_CHECK_SCRIPT_NAMES = ['test-for-ptbk-coder', 'check-for-ptbk-coder'] as const;

/** Conventional project validation scripts, ordered from lightweight checks to tests. */
const VALIDATION_SCRIPT_GROUPS = [
    ['lint', 'test-lint'],
    ['typecheck', 'type-check', 'type-checking', 'check-types', 'test-types'],
    ['build', 'test-build'],
] as const;

/** Conventional leaf test families used when the project has no usable test aggregate. */
const TEST_SCRIPT_GROUPS = [
    ['test-unit', 'test:unit'],
    ['test-integration', 'test:integration'],
    ['test-e2e', 'test:e2e'],
] as const;

/** Script names that must never be reached by a generated aggregate. */
const NON_VALIDATION_SCRIPT_PATTERN =
    /^(?:check$|coder:|(?:dev|start|serve|watch|deploy|publish|install|preinstall|postinstall|prepare|reset|clean)(?:$|[:-]))/iu;

/** Clearly unsuitable shell bodies are excluded even under a conventional validation name. */
const UNSUITABLE_VALIDATION_BODY_PATTERN =
    /(?:\b(?:ptbk|promptbook)\s+coder\s+(?:run|fix)|\bcoder:(?:run|fix)\b|--watch(?:All)?(?:\b|=)|\b(?:watch|nodemon|concurrently|serve|deploy|publish|install|reset|rm|rmdir|del|remove-item)\b|--if-present|\|\||(?:^|[^&])&(?:$|[^&])|;|\bexit\s+0\b)/iu;

/** Npm lifecycle hooks that run implicitly before and after a selected project script. */
const SCRIPT_LIFECYCLE_PREFIXES = ['pre', 'post'] as const;

/** Result of preparing project-owned checks and migrating recognized generated callers. @private internal initializer result */
export type PreparedCoderPackageJsonScripts = {
    readonly scripts: Readonly<Record<string, string>>;
    readonly checkScriptSummary: string;
    readonly migrationInstructions: ReadonlyArray<string>;
    readonly isCheckConfigured: boolean;
};

/**
 * Preserves project scripts, creates one canonical check, and migrates only exact generated caller forms.
 * @private shared package-script preparation for Coder initialization
 */
export function prepareCoderPackageJsonScripts(
    existing: Readonly<Record<string, string>>,
    externalCallers: Readonly<Record<string, ReadonlyArray<string>>> = {},
): PreparedCoderPackageJsonScripts {
    const scripts = { ...existing };
    const migrationInstructions: string[] = [];
    const legacyNames = LEGACY_CHECK_SCRIPT_NAMES.filter((name) =>
        Object.prototype.hasOwnProperty.call(existing, name),
    );
    let checkScriptSummary: string;

    if (Object.prototype.hasOwnProperty.call(existing, 'check')) {
        checkScriptSummary = 'Preserved project scripts.check exactly; Coder executes npm run check.';
    } else if (legacyNames.length > 0) {
        const sourceName = legacyNames[0]!;
        const isRecursive =
            scriptReaches(sourceName, 'check', existing, new Set()) ||
            scriptReaches(sourceName, sourceName, existing, new Set()) ||
            scriptReaches(sourceName, 'coder:run', existing, new Set()) ||
            scriptReaches(sourceName, 'coder:fix', existing, new Set());
        const conflictingLifecycleNames = SCRIPT_LIFECYCLE_PREFIXES.filter(
            (prefix) =>
                existing[`${prefix}check`] !== undefined &&
                existing[`${prefix}${sourceName}`] !== existing[`${prefix}check`],
        ).map((prefix) => `${prefix}check`);
        scripts.check =
            isRecursive || conflictingLifecycleNames.length > 0
                ? CHECK_SETUP_PLACEHOLDER_COMMAND
                : existing[sourceName]!;
        if (!isRecursive && conflictingLifecycleNames.length === 0) {
            // npm runs these hooks implicitly. Preserve their bodies as well as the main script's scope.
            for (const prefix of SCRIPT_LIFECYCLE_PREFIXES) {
                const legacyHook = existing[`${prefix}${sourceName}`];
                if (legacyHook !== undefined) scripts[`${prefix}check`] = legacyHook;
            }
        }
        checkScriptSummary = isRecursive
            ? `Kept recursive scripts.${sourceName} unchanged; configure scripts.check with validation that does not call check or Coder recursively.`
            : conflictingLifecycleNames.length > 0
            ? `Kept scripts.${sourceName} and conflicting ${conflictingLifecycleNames.join(
                  ', ',
              )} hooks unchanged; configure scripts.check and its lifecycle hooks to preserve the required validation.`
            : `Preserved scripts.${sourceName}'s validation command and npm lifecycle hooks in scripts.check: ${scripts.check}`;
    } else {
        const selectedScripts = selectValidationScripts(existing);
        scripts.check =
            selectedScripts.length > 0
                ? selectedScripts.map((name) => (name === 'test' ? 'npm test' : `npm run ${name}`)).join(' && ')
                : CHECK_SETUP_PLACEHOLDER_COMMAND;
        checkScriptSummary =
            selectedScripts.length > 0
                ? `Generated scripts.check from the available validation scripts (${selectedScripts.join(', ')}): ${
                      scripts.check
                  }`
                : 'No usable validation scripts found. scripts.check contains a failing setup placeholder; configure it before running Coder.';
    }

    for (const [name, command] of Object.entries(existing)) {
        if (
            ['check', ...legacyNames].some(
                (verificationName) =>
                    name === verificationName ||
                    SCRIPT_LIFECYCLE_PREFIXES.some((prefix) => name === `${prefix}${verificationName}`),
            )
        )
            continue;
        const migratedCaller = migrateGeneratedCoderRunScript(command);
        if (migratedCaller !== undefined) {
            // A different existing check is authoritative, but changing a custom legacy caller's scope is not safe.
            const referencedLegacyName = legacyNames.find((legacyName) => command.includes(legacyName));
            const isConflictingCustomCheck =
                referencedLegacyName !== undefined &&
                !isLegacyCheckScopePreserved(referencedLegacyName, scripts) &&
                !isUnchangedLegacyCheckDefault(referencedLegacyName, scripts);
            if (!isConflictingCustomCheck) scripts[name] = migratedCaller;
        }
    }

    for (const legacyName of legacyNames) {
        const callers = Object.entries(scripts)
            .filter(([name, command]) => name !== legacyName && command.includes(legacyName))
            .map(([name]) => name);
        const isPreservedScope = isLegacyCheckScopePreserved(legacyName, scripts);
        const isObsoleteGeneratedDefault =
            isUnchangedLegacyCheckDefault(legacyName, scripts) && !isCheckSetupRequired(scripts.check!);
        const files = externalCallers[legacyName] ?? [];
        if (callers.length === 0 && files.length === 0 && (isPreservedScope || isObsoleteGeneratedDefault)) {
            delete scripts[legacyName];
            for (const prefix of SCRIPT_LIFECYCLE_PREFIXES) delete scripts[`${prefix}${legacyName}`];
        } else {
            migrationInstructions.push(
                `Kept scripts.${legacyName}${
                    callers.length ? `; referenced by scripts.${callers.join(', scripts.')}` : ''
                }${files.length ? `; referenced by ${files.join(', ')}` : ''}${
                    !isPreservedScope && !isObsoleteGeneratedDefault
                        ? '; its custom command or npm lifecycle hooks differ from scripts.check'
                        : ''
                }. Preserve its required validation and pre/post hooks in scripts.check, update those callers to npm run check, then remove scripts.${legacyName} and its unused lifecycle hooks.`,
            );
        }
    }
    for (const [name, command] of Object.entries(scripts)) {
        if (
            /\b(?:ptbk|promptbook)\s+coder\s+(?:run|server)\b|\brun-codex-prompts\b/u.test(command) &&
            /--test(?:-before)?(?:\s|=|$)/u.test(command)
        ) {
            migrationInstructions.push(
                `Update scripts.${name}: replace --test with --check and --test-before with --check-before; review its shell expression manually. Existing command was preserved: ${command}`,
            );
        }
    }

    let isCheckConfigured = true;
    try {
        assertProjectCheckScriptsAreConfigured(scripts);
    } catch (error) {
        if (!(error instanceof CoderCheckSetupError)) throw error;
        isCheckConfigured = false;
        checkScriptSummary += ` Additional setup required: ${error.message}`;
    }

    return {
        scripts,
        checkScriptSummary,
        migrationInstructions,
        isCheckConfigured,
    };
}

/** Determines whether both the legacy command and its implicit npm validation hooks have been preserved. */
function isLegacyCheckScopePreserved(name: string, scripts: Readonly<Record<string, string>>): boolean {
    return (
        scripts[name] === scripts.check &&
        SCRIPT_LIFECYCLE_PREFIXES.every((prefix) => scripts[`${prefix}${name}`] === scripts[`${prefix}check`])
    );
}

/** Recognizes the generated default only when no custom lifecycle hooks extend its validation scope. */
function isUnchangedLegacyCheckDefault(name: string, scripts: Readonly<Record<string, string>>): boolean {
    return (
        scripts[name] === 'npm test' &&
        SCRIPT_LIFECYCLE_PREFIXES.every((prefix) => scripts[`${prefix}${name}`] === undefined)
    );
}

/**
 * Recognizes unchanged generated run scripts, including the previous explicit Developer/context defaults.
 * Unknown shell expressions and custom harness configuration are preserved for manual migration.
 */
function migrateGeneratedCoderRunScript(command: string): string | undefined {
    const prefix = 'npx ptbk coder run --harness openai-codex --thinking-level max';
    const defaultArguments = ['', ' --agent agents/developer.book --context AGENTS.md'];
    const verificationArguments = [
        ' --test-before yes-and-fix',
        ...LEGACY_CHECK_SCRIPT_NAMES.map((name) => ` --test "npm run ${name}" --test-before yes-and-fix`),
        ...LEGACY_CHECK_SCRIPT_NAMES.map((name) => ` --check "npm run ${name}" --check-before yes-and-fix`),
    ];
    const isGenerated = defaultArguments.some((defaults) =>
        verificationArguments.some((verification) => command === prefix + defaults + verification),
    );
    return isGenerated ? getDefaultCoderPackageJsonScripts()['coder:run'] : undefined;
}

/** Selects safe conventional scripts, avoiding duplicates already reached by another selected aggregate. */
function selectValidationScripts(scripts: Readonly<Record<string, string>>): string[] {
    if (
        SCRIPT_LIFECYCLE_PREFIXES.some(
            (prefix) =>
                scripts[`${prefix}check`] !== undefined &&
                !isUsableValidationScript(`${prefix}check`, scripts, new Set()),
        )
    )
        return [];
    const selected: string[] = [];
    for (const group of VALIDATION_SCRIPT_GROUPS) {
        const name = group.find((candidate) => isUsableValidationScript(candidate, scripts, new Set()));
        if (name !== undefined) selected.push(name);
    }
    if (isUsableValidationScript('test', scripts, new Set())) selected.push('test');
    else
        for (const group of TEST_SCRIPT_GROUPS) {
            const name = group.find((candidate) => isUsableValidationScript(candidate, scripts, new Set()));
            if (name !== undefined) selected.push(name);
        }
    return selected.filter(
        (name) => !selected.some((other) => other !== name && scriptReaches(other, name, scripts, new Set())),
    );
}

/** Inspects each body, referenced script, and implicit lifecycle hook before including it in an aggregate. */
function isUsableValidationScript(
    name: string,
    scripts: Readonly<Record<string, string>>,
    visited: ReadonlySet<string>,
): boolean {
    const command = scripts[name];
    if (
        !command ||
        visited.has(name) ||
        NON_VALIDATION_SCRIPT_PATTERN.test(name) ||
        isCheckSetupRequired(command) ||
        UNSUITABLE_VALIDATION_BODY_PATTERN.test(command)
    )
        return false;
    if (
        command.split('&&').every((part) => /^\s*(?:echo|printf|true|:)(?:\s|$)/iu.test(part)) ||
        /\bprocess\.exit\(\s*0\s*\)/u.test(command)
    )
        return false;
    if (
        /\b(?:vite|next|astro|webpack-dev-server)\s+(?:dev|start|serve)\b/iu.test(command) ||
        /(?:^|&&)\s*(?:vite|webpack-dev-server)(?:\s*$|\s+--)/iu.test(command) ||
        (/\bvitest\b/iu.test(command) && !/\bvitest\s+run\b/iu.test(command))
    )
        return false;
    const nextVisited = new Set([...visited, name]);
    const references = projectScriptReferences(command);
    // Ambiguous package-manager flags and cwd switches cannot be composed confidently as root validation.
    if (
        /\b(?:npm|pnpm|yarn)\s+(?:--|run(?:-script)?\s+--)/u.test(command) ||
        (/\b(?:npm|pnpm|yarn)\b/u.test(command) && references.length === 0)
    )
        return false;
    if (references.some((reference) => !isUsableValidationScript(reference, scripts, nextVisited))) return false;
    return SCRIPT_LIFECYCLE_PREFIXES.every((prefix) => {
        const lifecycleName = `${prefix}${name}`;
        return scripts[lifecycleName] === undefined || isUsableValidationScript(lifecycleName, scripts, nextVisited);
    });
}

/** Checks whether a selected aggregate already reaches another selected script. */
function scriptReaches(
    name: string,
    target: string,
    scripts: Readonly<Record<string, string>>,
    visited: ReadonlySet<string>,
): boolean {
    if (visited.has(name)) return false;
    const nextVisited = new Set([...visited, name]);
    const command = scripts[name] ?? '';
    if (
        (target === 'coder:run' && /\b(?:ptbk|promptbook)\s+coder\s+run\b/u.test(command)) ||
        (target === 'coder:fix' && /\b(?:ptbk|promptbook)\s+coder\s+fix\b/u.test(command))
    )
        return true;
    const references = [
        ...projectScriptReferences(command),
        ...SCRIPT_LIFECYCLE_PREFIXES.map((prefix) => `${prefix}${name}`).filter(
            (lifecycleName) => scripts[lifecycleName] !== undefined,
        ),
    ];
    return references.some(
        (reference) => reference === target || scriptReaches(reference, target, scripts, nextVisited),
    );
}
