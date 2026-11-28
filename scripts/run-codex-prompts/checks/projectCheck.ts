import { readFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { DEFAULT_CODER_CHECK_COMMAND } from './CheckBeforeMode';
import { projectScriptReferences } from './projectScriptReferences';

/**
 * Failing setup placeholder used only when initialization finds no usable project validation scripts.
 */
export const CHECK_SETUP_PLACEHOLDER_COMMAND = `node -e "console.error('Configure package.json scripts.check with project validation commands before running Coder.'); process.exit(1)"`;

/** Retired generated script names inspected only to report stale caller configuration. */
const LEGACY_CHECK_SCRIPT_NAMES = new Set(['test-for-ptbk-coder', 'check-for-ptbk-coder']);

/**
 * A missing or unconfigured project check needs project-owner setup, rather than model repair retries.
 */
export class CoderCheckSetupError extends NotAllowed {
    /** Creates an actionable project check setup error. */
    public constructor(details: string) {
        super(
            spaceTrim(`
            Project check is not configured: ${details}

            Configure the selected validation scripts in \`package.json\`. The canonical aggregate is \`scripts.check\`, invoked as \`${DEFAULT_CODER_CHECK_COMMAND}\`.
            Coder will not replace missing validation with a successful placeholder or tests alone.
        `),
        );
        Object.setPrototypeOf(this, CoderCheckSetupError.prototype);
    }
}

/**
 * Detects the generated setup placeholder and the conventional npm unconfigured-test placeholder.
 */
export function isCheckSetupRequired(command: string): boolean {
    return (
        !command.trim() ||
        command.includes('Configure package.json scripts.check') ||
        /no test specified/iu.test(command)
    );
}

/**
 * Inspects root project check references before an initial check or repair loop can start.
 * Flags and shell composition do not bypass setup validation; execution still uses the existing shell runner.
 */
export async function assertProjectCheckIsConfigured(command: string | undefined, projectPath: string): Promise<void> {
    if (!command) return;
    const references = projectScriptReferences(command);
    if (references.length === 0) return;
    let packageJson: { scripts?: Record<string, unknown> };
    try {
        packageJson = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'));
    } catch (error) {
        throw new CoderCheckSetupError(
            `cannot read package.json (${error instanceof Error ? error.message : String(error)}).`,
        );
    }
    for (const reference of references) {
        if (LEGACY_CHECK_SCRIPT_NAMES.has(reference) && packageJson?.scripts?.[reference] === undefined) {
            throw new CoderCheckSetupError(
                `scripts.${reference} is missing and is no longer initialized by Coder. Update this caller to \`--check "${DEFAULT_CODER_CHECK_COMMAND}"\`; no compatibility alias is generated.`,
            );
        }
        assertProjectCheckScriptsAreConfigured(packageJson?.scripts ?? {}, reference);
    }
}

/**
 * Validates the project-owned check definition without running commands or changing its scope.
 * Initialization and execution use this same setup diagnostic for missing leaves and recursive callers.
 */
export function assertProjectCheckScriptsAreConfigured(
    scripts: Readonly<Record<string, unknown>>,
    name = 'check',
): void {
    assertReferencedScriptsAreConfigured(name, scripts, new Set());
}

/** Detects missing/placeholder leaf validation and recursive npm callers before a model repair loop can start. */
function assertReferencedScriptsAreConfigured(
    name: string,
    scripts: Readonly<Record<string, unknown>>,
    ancestors: ReadonlySet<string>,
): void {
    if (ancestors.has(name)) throw new CoderCheckSetupError(`scripts.${name} recursively calls the check pipeline.`);
    const command = scripts[name];
    if (typeof command !== 'string' || isCheckSetupRequired(command)) {
        throw new CoderCheckSetupError(`scripts.${name} is missing, empty, or contains a setup placeholder.`);
    }
    if (/^coder:(?:run|fix)$/u.test(name) || /\b(?:ptbk|promptbook)\s+coder\s+(?:run|fix)\b/u.test(command)) {
        throw new CoderCheckSetupError(`scripts.${name} calls Coder execution instead of project validation.`);
    }
    const nextAncestors = new Set([...ancestors, name]);
    // The shared inspector keeps root references before a directory change and leaves child workspaces opaque.
    for (const reference of projectScriptReferences(command)) {
        assertReferencedScriptsAreConfigured(reference, scripts, nextAncestors);
    }
    for (const prefix of ['pre', 'post']) {
        const lifecycleName = `${prefix}${name}`;
        if (scripts[lifecycleName] !== undefined)
            assertReferencedScriptsAreConfigured(lifecycleName, scripts, nextAncestors);
    }
}

// Note: [💞] Ignore a discrepancy between file name and exported helper names
