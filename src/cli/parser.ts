import { parseDuration } from '../common/duration.js';
import { usageError } from '../common/errors.js';
import { matchEnum } from '../common/naming.js';
import { allOptions, type CommandSpec, type OptionSpec } from './spec.js';

/**
 * Parsed option values keyed by option name (negated booleans are stored as `false`).
 *
 * @private CLI parser
 */
export type ParsedOptions = Readonly<Record<string, unknown>>;

/**
 * Result of parsing an invocation.
 *
 * @private CLI parser
 */
export type ParsedInvocation =
    | { readonly kind: 'version' }
    | { readonly kind: 'help'; readonly path: readonly string[]; readonly raw: boolean }
    /** Bare `ptbk`: the action picker when interactive, technical help otherwise. */
    | { readonly kind: 'bare'; readonly raw: boolean; readonly interactive?: boolean; readonly nonInteractive: boolean }
    | {
          readonly kind: 'command';
          /** Resolved command path, e.g. `['access', 'pair']`. */
          readonly path: readonly string[];
          readonly spec: CommandSpec;
          readonly options: ParsedOptions;
          /** Names of options given explicitly. */
          readonly explicit: ReadonlySet<string>;
          readonly positionals: readonly string[];
      };

/**
 * Finds a command or subcommand by name or alias.
 *
 * @private CLI parser
 */
export function findCommand(commands: readonly CommandSpec[], word: string): CommandSpec | undefined {
    return commands.find((command) => command.name === word || command.aliases?.includes(word));
}

/**
 * Edit distance for "did you mean" suggestions.
 */
function distance(a: string, b: string): number {
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i++) {
        let previous = row[0]!;
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const current = row[j]!;
            row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
            previous = current;
        }
    }
    return row[b.length]!;
}

/**
 * Suggests the closest known word.
 *
 * @private CLI parser
 */
export function suggest(word: string, candidates: readonly string[]): string | undefined {
    let best: { candidate: string; score: number } | undefined;
    for (const candidate of candidates) {
        const score = distance(word, candidate);
        if (score <= Math.max(2, Math.floor(candidate.length / 3)) && (!best || score < best.score)) best = { candidate, score };
    }
    return best?.candidate;
}

/**
 * Resolves the deepest command path from leading positional words.
 */
function resolvePath(commands: readonly CommandSpec[], words: readonly string[]): { path: string[]; spec?: CommandSpec; consumed: number } {
    let spec: CommandSpec | undefined;
    let level = commands;
    const path: string[] = [];
    let consumed = 0;
    for (const word of words) {
        const found = findCommand(level, word);
        if (!found) break;
        spec = found;
        path.push(found.name);
        consumed++;
        level = found.subcommands ?? [];
        if (!level.length) break;
    }
    return { path, spec, consumed };
}

/**
 * Converts a raw option value according to its type.
 */
function convertValue(option: OptionSpec, raw: string, commandPath: string): unknown {
    switch (option.type) {
        case 'integer': {
            if (!/^-?\d+$/.test(raw.trim())) throw usageError(`--${option.name} expects an integer, got "${raw}".`, commandPath);
            return Number(raw);
        }
        case 'duration': {
            const parsed = parseDuration(raw);
            if (!parsed.ok) throw usageError(`--${option.name}: ${parsed.reason}`, commandPath);
            return parsed.ms;
        }
        case 'enum': {
            // Tolerant input (case and separators, e.g. YES_AND_FAIL for yes-and-fail); the documented spelling is kept.
            const value = matchEnum(raw, option.values!);
            if (!value) throw usageError(`--${option.name} must be one of ${option.values!.join(', ')} (got "${raw}").`, commandPath);
            return value;
        }
        case 'boolean':
            if (raw === 'true' || raw === 'false') return raw === 'true';
            throw usageError(`--${option.name} does not take a value.`, commandPath);
        default:
            return raw;
    }
}

/**
 * Removed commands with the actionable replacement (never silently another workflow).
 */
const REMOVED_COMMANDS: Readonly<Record<string, string>> = {
    run: '`ptbk start` operates the ongoing engine: it executes eligible tasks one at a time, routes unassigned work through Router and keeps running (stop it with `ptbk stop`). Describe bounded work as ordinary tasks (`ptbk add`).',
};

/**
 * Parses `argv` (without the node executable and script) against the command registry.
 *
 * Help requests (`--help`, `-h`, a trailing `help`, `ptbk help <path>`) are resolved before anything else.
 * Unknown options are errors; they are never silently ignored.
 *
 * @private CLI parser
 */
export function parseInvocation(argv: readonly string[], commands: readonly CommandSpec[]): ParsedInvocation {
    const separator = argv.indexOf('--');
    const head = separator >= 0 ? argv.slice(0, separator) : [...argv];
    const tail = separator >= 0 ? argv.slice(separator + 1) : [];
    const raw = head.includes('--raw') || head.includes('--no-ui');
    const words = positionalWords(head, commands);
    const wantsHelp = head.includes('--help') || head.includes('-h');

    if (!head.length && !tail.length) return { kind: 'bare', raw, nonInteractive: false };
    if (words[0] === 'help') {
        const target = resolvePath(commands, words.slice(1));
        if (words.length > 1 && target.consumed < words.length - 1) {
            const unknown = words[1 + target.consumed]!;
            throw usageError(
                `Unknown command path "${words.slice(1).join(' ')}".`,
                target.path.join(' '),
                suggestionText(unknown, target.spec ? (target.spec.subcommands ?? []) : commands),
            );
        }
        return { kind: 'help', path: target.path, raw };
    }
    const resolved = resolvePath(commands, words);
    if (!resolved.spec) {
        if (head.includes('--version') && !words.length) return { kind: 'version' };
        const globalOptions = ['--raw', '--no-ui', '--interactive', '--non-interactive', '--no-terminal-title', '--help', '-h'];
        const presentationOnly = head.every((token, index) => globalOptions.includes(token) || ['--path', '--tasks'].includes(token) || /^--(path|tasks)=/.test(token) || ['--path', '--tasks'].includes(head[index - 1] ?? ''));
        if (wantsHelp && !words.length) return { kind: 'help', path: [], raw };
        if (presentationOnly && !words.length) return { kind: 'bare', raw, interactive: head.includes('--interactive') || undefined, nonInteractive: head.includes('--non-interactive') };
        const first = words[0] ?? head.find((token) => token.startsWith('-')) ?? '';
        if (!words.length) throw usageError(`Unknown option ${first}.`, '', 'Options must follow a command, e.g. `ptbk start --no-server`.');
        const removed = REMOVED_COMMANDS[first];
        if (removed) throw usageError(`ptbk ${first} was removed.`, '', removed);
        throw usageError(`Unknown command "${first}".`, '', suggestionText(first, commands));
    }
    if (wantsHelp || words[resolved.consumed] === 'help') return { kind: 'help', path: resolved.path, raw };
    if (head.includes('--version')) return { kind: 'version' };
    if (resolved.spec.subcommands?.length && !resolved.spec.run) {
        const next = words[resolved.consumed];
        if (next) throw usageError(`Unknown subcommand "${next}" of ptbk ${resolved.path.join(' ')}.`, resolved.path.join(' '), suggestionText(next, resolved.spec.subcommands));
        return { kind: 'help', path: resolved.path, raw };
    }
    return parseCommandArguments(resolved.spec, resolved.path, head, resolved.consumed, tail);
}

/**
 * Collects every value-taking option name across all commands (option types are consistent between commands).
 */
function valueOptionNames(commands: readonly CommandSpec[]): Set<string> {
    const names = new Set<string>();
    const visit = (command: CommandSpec): void => {
        for (const option of allOptions(command)) if (option.type !== 'boolean') names.add(option.name);
        for (const subcommand of command.subcommands ?? []) visit(subcommand);
    };
    for (const command of commands) visit(command);
    return names;
}

/**
 * Returns the non-option words of an invocation, skipping values consumed by `--option value`.
 */
function positionalWords(head: readonly string[], commands: readonly CommandSpec[]): string[] {
    const valueOptions = valueOptionNames(commands);
    const words: string[] = [];
    for (let index = 0; index < head.length; index++) {
        const token = head[index]!;
        if (token.startsWith('--')) {
            if (!token.includes('=') && valueOptions.has(token.slice(2))) index++;
            continue;
        }
        if (token.startsWith('-') && token !== '-') continue;
        words.push(token);
    }
    return words;
}

/**
 * Builds a "did you mean" hint.
 */
function suggestionText(word: string, commands: readonly CommandSpec[]): string | undefined {
    const candidate = suggest(word, commands.flatMap((command) => [command.name, ...(command.aliases ?? [])]));
    return candidate ? `Did you mean \`${candidate}\`?` : undefined;
}

/**
 * Parses options and positionals of a resolved command.
 */
function parseCommandArguments(spec: CommandSpec, path: string[], head: readonly string[], consumedWords: number, tail: readonly string[]): ParsedInvocation {
    const commandPath = path.join(' ');
    const options = allOptions(spec);
    const byName = new Map(options.map((option) => [option.name, option]));
    const byShort = new Map(options.filter((option) => option.short).map((option) => [option.short!, option]));
    const values: Record<string, unknown> = {};
    const explicit = new Set<string>();
    const positionals: string[] = [];
    let skippedWords = 0;
    const assign = (option: OptionSpec, value: unknown): void => {
        if (option.repeatable) values[option.name] = [...((values[option.name] as unknown[] | undefined) ?? []), value];
        else {
            if (explicit.has(option.name) && values[option.name] !== value) {
                throw usageError(`--${option.name} was given more than once with different values.`, commandPath);
            }
            values[option.name] = value;
        }
        explicit.add(option.name);
    };
    for (let index = 0; index < head.length; index++) {
        const token = head[index]!;
        if (!token.startsWith('-') || token === '-') {
            if (skippedWords < consumedWords) {
                skippedWords++;
                continue;
            }
            positionals.push(token);
            continue;
        }
        if (token === '--version') continue;
        if (/^-[A-Za-z]$/.test(token)) {
            const option = byShort.get(token.slice(1));
            if (!option) throw usageError(`Unknown option ${token} for ptbk ${commandPath}.`, commandPath);
            if (option.type === 'boolean') assign(option, true);
            else {
                const value = head[++index];
                if (value === undefined) throw usageError(`${token} requires a value.`, commandPath);
                assign(option, convertValue(option, value, commandPath));
            }
            continue;
        }
        const [rawName, inlineValue] = token.slice(2).split(/=(.*)/s, 2) as [string, string | undefined];
        let option = byName.get(rawName);
        let negated = false;
        if (!option && rawName.startsWith('no-')) {
            const candidate = byName.get(rawName.slice(3));
            if (candidate && candidate.type === 'boolean' && candidate.negatable) {
                option = candidate;
                negated = true;
            }
        }
        if (!option || (option.negatedOnly && !negated)) {
            const known = options.filter((item) => !item.hidden).flatMap((item) => (item.negatedOnly ? [`no-${item.name}`] : item.negatable ? [item.name, `no-${item.name}`] : [item.name]));
            const hint = suggest(rawName, known);
            throw usageError(`Unknown option --${rawName} for ptbk ${commandPath}.`, commandPath, hint ? `Did you mean --${hint}?` : undefined);
        }
        if (option.type === 'boolean') {
            if (inlineValue !== undefined) {
                if (negated) throw usageError(`--no-${option.name} does not take a value.`, commandPath);
                assign(option, convertValue(option, inlineValue, commandPath));
            } else assign(option, !negated);
            continue;
        }
        const value = inlineValue ?? head[++index];
        if (value === undefined) throw usageError(`--${option.name} requires a value${option.valueName ? ` ${option.valueName}` : ''}.`, commandPath);
        assign(option, convertValue(option, value, commandPath));
    }
    positionals.push(...tail);
    const argumentsSpec = spec.arguments ?? [];
    const required = argumentsSpec.filter((argument) => argument.required).length;
    const variadic = argumentsSpec.some((argument) => argument.variadic);
    if (positionals.length < required) throw usageError(`Missing ${argumentsSpec[positionals.length]!.name} for ptbk ${commandPath}.`, commandPath);
    if (!variadic && positionals.length > argumentsSpec.length) {
        throw usageError(`Unexpected argument "${positionals[argumentsSpec.length]}" for ptbk ${commandPath}.`, commandPath);
    }
    if (values['no-ui'] === true) {
        values.raw = true;
        explicit.add('raw');
    }
    return { kind: 'command', path, spec, options: values, explicit, positionals };
}
