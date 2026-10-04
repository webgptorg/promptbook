/** Conventional root command boundaries, including subshells and environment assignments. */
const SCRIPT_COMMAND_PREFIX = String.raw`(?:^|&&|\|\||;|\n|[()])\s*(?:(?:env\s+)?[A-Za-z_]\w*=(?:[^\s'";&|()]+|"[^"]*"|'[^']*')\s+)*`;

/** Package-manager options which do not select a different directory or workspace. */
const QUIET_OPTIONS = String.raw`(?:(?:--silent|--quiet|-s|-q)\s+)*`;

/** Quoted script names preserve spaces, while unquoted names use conventional npm identifier characters. */
const SCRIPT_NAME = String.raw`(?:(["'])([^"'\r\n]+)\1|([\w:.-]+))(?=\s|$|[;&|()])`;

/** Quoted payloads and escaped characters are opaque to this configuration inspection. */
const OPAQUE_ARGUMENT = String.raw`"(?:\\.|[^"\\])*"|'[^']*'|\\[\s\S]`;

/** Only references before a conventional directory change can confidently belong to the root package. */
const DIRECTORY_CHANGE_COMMAND = new RegExp(
    `${SCRIPT_COMMAND_PREFIX}(?:cd|pushd|popd)(?=\\s|$)|(?<argument>${OPAQUE_ARGUMENT})`,
    'gu',
);

/** Arguments up to the next conventional command boundary, preserving quoted payloads as opaque text. */
const SCRIPT_ARGUMENTS = new RegExp(String.raw`^(?:${OPAQUE_ARGUMENT}|[^;&|\n()'"\\])*`, 'u');

/** Package-manager options that select validation from a different directory or workspace. */
const PROJECT_OVERRIDE_OPTION = /\s(?:--prefix|--dir|--cwd|-C|--workspace|--workspaces|-w|--filter)(?:\s|=|$)/u;

/**
 * Reads conventional npm/pnpm/yarn script references for configuration inspection.
 * Commands are still executed verbatim by the existing shell runner; this helper neither parses nor rewrites shells.
 * Options selecting other workspaces remain opaque so their scripts are not mistaken for root validation.
 * Inspection stops at the first directory change; quoted examples do not change the inspected workspace.
 */
export function projectScriptReferences(command: string): string[] {
    const directoryChange = [...command.matchAll(DIRECTORY_CHANGE_COMMAND)].find(
        (match) => match.groups?.argument === undefined,
    );
    if (directoryChange) command = command.slice(0, directoryChange.index);
    const references = [
        ...command.matchAll(
            new RegExp(
                `${SCRIPT_COMMAND_PREFIX}(?:npm|pnpm|yarn)\\s+${QUIET_OPTIONS}(?:run(?:-script)?\\s+${QUIET_OPTIONS}${SCRIPT_NAME}|(?:test|t)(?=\\s|$|[;&|()]))` +
                    `|(?<argument>${OPAQUE_ARGUMENT})`,
                'gu',
            ),
        ),
    ]
        .filter((match) => isRootProjectScriptReference(command, match))
        .map((match) => match[2] ?? match[3] ?? 'test');
    for (const match of command.matchAll(
        new RegExp(
            `${SCRIPT_COMMAND_PREFIX}(?:pnpm|yarn)\\s+${QUIET_OPTIONS}(?!run\\b|-)${SCRIPT_NAME}` +
                `|(?<argument>${OPAQUE_ARGUMENT})`,
            'gu',
        ),
    ))
        if (isRootProjectScriptReference(command, match)) references.push((match[2] ?? match[3])!);
    return [...new Set(references)];
}

/** Excludes quoted examples and package-manager directory overrides without altering the executed command. */
function isRootProjectScriptReference(command: string, match: RegExpMatchArray): boolean {
    if (match.groups?.argument !== undefined) return false;
    const argumentsText = command.slice(match.index! + match[0].length).match(SCRIPT_ARGUMENTS)?.[0] ?? '';
    // Flags after npm's `--` separator belong to the leaf tool, rather than the package manager.
    const packageManagerArguments = argumentsText.split(/\s--(?:\s|$)/u)[0] ?? '';
    return !PROJECT_OVERRIDE_OPTION.test(packageManagerArguments);
}
