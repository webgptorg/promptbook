import { ENGINE_VERSION } from '../common/version.js';
import { fit, stringWidth, wrap } from '../ui/ansi.js';
import { badgeFace, badgeIdentity } from '../ui/badges.js';
import { renderPanel } from '../ui/panels.js';
import type { TerminalProfile } from '../ui/terminal.js';
import { findCommand } from './parser.js';
import type { CommandCategory, CommandSpec, OptionSpec } from './spec.js';

/**
 * Order of categories in the overview.
 */
const CATEGORY_ORDER: readonly CommandCategory[] = ['Start here', 'Run the agenda', 'Observe and respond', 'Author work', 'Maintain', 'Information'];

/**
 * Formats an option's flag column, e.g. `--path <dir>` or `--no-commit`.
 *
 * @private CLI help
 */
export function optionLabel(option: OptionSpec): string {
    const base = option.negatedOnly ? `--no-${option.name}` : option.negatable ? `--[no-]${option.name}` : `--${option.name}`;
    const short = option.short ? `-${option.short}, ` : '';
    const value = option.type === 'boolean' ? '' : ` ${option.valueName ?? `<${option.type}>`}`;
    return `${short}${base}${value}`;
}

/**
 * A help document: sections of (heading, rows/paragraphs).
 */
type HelpSection = { heading?: string; paragraphs?: string[]; rows?: Array<[string, string]>; code?: string[] };

/**
 * Renders help sections in pretty or raw form with the same content.
 */
function renderSections(title: string, sections: readonly HelpSection[], terminal: TerminalProfile, banner?: string[]): string {
    const { style } = terminal;
    const width = Math.min(terminal.columns(), 100);
    const output: string[] = [];
    if (terminal.pretty && banner) {
        output.push(...renderPanel({ title, titleRight: `ptbk ${ENGINE_VERSION}`, lines: banner, width, tone: 'accent', unicode: terminal.unicode, style }), '');
    } else if (terminal.pretty) {
        output.push(`${style.bold(style.accent(title))}  ${style.muted(`ptbk ${ENGINE_VERSION}`)}`, '');
    } else {
        output.push(`${title} (ptbk ${ENGINE_VERSION})`);
        if (banner) output.push(...banner);
        output.push('');
    }
    for (const section of sections) {
        if (section.heading) output.push(terminal.pretty ? style.bold(style.accent(section.heading)) : `${section.heading}:`);
        (section.paragraphs ?? []).forEach((paragraph, index) => {
            if (index > 0) output.push('');
            for (const line of wrap(paragraph, width - 2)) output.push(`  ${line}`);
        });
        if (section.code) for (const line of section.code) output.push(`  ${terminal.pretty ? style.bold(line) : line}`);
        if (section.rows?.length) {
            const labelWidth = Math.min(34, Math.max(...section.rows.map(([label]) => stringWidth(label))));
            for (const [label, description] of section.rows) {
                const descriptionWidth = Math.max(20, width - labelWidth - 6);
                const lines = wrap(description, descriptionWidth);
                const labelText = stringWidth(label) > labelWidth ? label : fit(label, labelWidth);
                if (stringWidth(label) > labelWidth) {
                    output.push(`  ${terminal.pretty ? style.bold(label) : label}`);
                    lines.forEach((line) => output.push(`  ${' '.repeat(labelWidth)}  ${terminal.pretty ? style.muted(line) : line}`));
                } else {
                    lines.forEach((line, index) =>
                        output.push(`  ${index === 0 ? (terminal.pretty ? style.bold(labelText) : labelText) : ' '.repeat(labelWidth)}  ${terminal.pretty ? style.muted(line) : line}`),
                    );
                }
            }
        }
        output.push('');
    }
    return `${output.join('\n').replace(/\n+$/, '')}\n`;
}

/**
 * Renders the top-level overview (bare `ptbk`, `ptbk help`, `ptbk --help`).
 *
 * @private CLI help
 */
export function renderTopLevelHelp(commands: readonly CommandSpec[], terminal: TerminalProfile): string {
    const mascot = badgeFace(badgeIdentity('Expert'), 'working');
    const banner = [
        `${terminal.pretty ? terminal.style.color256(75, mascot) : mascot}  Operate agents over a Git project.`,
        'Readable agents and tasks; one task at a time; every accepted result is checked and committed.',
    ];
    const sections: HelpSection[] = [
        { heading: 'Usage', code: ['ptbk <command> [options]'] },
        {
            heading: 'Ordinary workflow',
            rows: [
                ['1. ptbk init', 'Prepare this project (finite wizard; flags for unattended use).'],
                ['2. ptbk start', 'Run the agenda as a background service; reports once and returns.'],
                ['3. ptbk dashboard', 'Attach a live terminal view and controls (leaving it keeps the service running).'],
            ],
        },
    ];
    for (const category of CATEGORY_ORDER) {
        const members = commands.filter((command) => command.category === category && !command.hidden);
        if (!members.length) continue;
        sections.push({
            heading: category,
            rows: members.map((command) => [`${command.name}${command.aliases?.length ? ` (${command.aliases.join(', ')})` : ''}`, command.summary]),
        });
    }
    sections.push({
        heading: 'Common options',
        rows: [
            ['--path <dir>', 'Project directory (default: current directory).'],
            ['--raw', 'Plain output without color, layout, prompts or QR art (automatic when redirected).'],
            ['--non-interactive', 'Never ask questions; supply decisions with flags.'],
            ['--help, help', 'Help for one command, e.g. `ptbk start --help` or `ptbk help start`.'],
            ['--version', 'Print the running engine version.'],
        ],
    });
    sections.push({
        paragraphs: [
            'Presentation (pretty/raw) and input policy are independent of process placement: `ptbk start` always launches a background daemon unless `--foreground` is given. Command flags are temporary overrides; saved defaults live in ptbk.json.',
            'Run `ptbk help <command>` for its options, defaults and examples.',
        ],
    });
    return renderSections('Promptbook', sections, terminal, banner);
}

/**
 * Renders help for one command path only.
 *
 * @private CLI help
 */
export function renderCommandHelp(commands: readonly CommandSpec[], path: readonly string[], terminal: TerminalProfile): string {
    let spec: CommandSpec | undefined;
    let level = commands;
    for (const word of path) {
        spec = findCommand(level, word);
        level = spec?.subcommands ?? [];
    }
    if (!spec) return renderTopLevelHelp(commands, terminal);
    const invocation = `ptbk ${path.join(' ')}`;
    const argumentsText = (spec.arguments ?? []).map((argument) => (argument.required ? `<${argument.name}${argument.variadic ? '...' : ''}>` : `[${argument.name}${argument.variadic ? '...' : ''}]`));
    const usage = spec.subcommands?.length && !spec.run ? [`${invocation} <subcommand> [options]`] : [`${[invocation, ...argumentsText].join(' ')} [options]`];
    const sections: HelpSection[] = [{ heading: 'Usage', code: usage }, { paragraphs: spec.description.split(/\n\s*\n/).map((paragraph) => paragraph.replace(/\s+/g, ' ').trim()) }];
    if (spec.aliases?.length) sections.push({ heading: 'Aliases', paragraphs: [spec.aliases.map((alias) => `ptbk ${[...path.slice(0, -1), alias].join(' ')}`).join(', ')] });
    if (spec.arguments?.length) sections.push({ heading: 'Arguments', rows: spec.arguments.map((argument) => [argument.name, `${argument.description}${argument.required ? '' : ' (optional)'}`]) });
    if (spec.subcommands?.length) {
        sections.push({ heading: 'Subcommands', rows: spec.subcommands.map((subcommand) => [`${subcommand.name}`, subcommand.summary]) });
    }
    for (const group of spec.optionGroups) {
        const visible = group.options.filter((item) => !item.hidden);
        if (!visible.length) continue;
        sections.push({
            heading: group.shared ? `${group.title} (shared)` : group.title,
            rows: visible.map((item) => [optionLabel(item), `${item.description}${item.defaultText ? ` Default: ${item.defaultText}.` : ''}${item.note ? ` ${item.note}` : ''}`]),
        });
    }
    if (spec.examples.length) sections.push({ heading: 'Examples', rows: spec.examples.map((example) => [example.command, example.description]) });
    sections.push({ paragraphs: [`More: \`ptbk help\` lists all commands${path.length > 1 ? `; \`ptbk help ${path.slice(0, -1).join(' ')}\` shows the parent command` : ''}.`] });
    return renderSections(`${invocation} — ${spec.summary.replace(/\.$/, '')}`, sections, terminal);
}
