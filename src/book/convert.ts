import { COMMITMENTS, matchCommitmentKeyword } from './commitments.js';
import { fenceMarker, parseBook, type EntityKind } from './parse.js';
import { DECLARATION_KEYWORD, declarationName, renderCommitment } from './write.js';

/**
 * Conventional folder of a source, the documented context former syntax relied on for its kind.
 *
 * @private Book conversion
 */
export type LegacyLocation = 'agents' | 'tasks' | 'chats' | undefined;

/**
 * Outcome of converting one source.
 *
 * @private Book conversion
 */
export type BookConversion =
    | { readonly kind: 'unchanged' }
    | { readonly kind: 'converted'; readonly entity: EntityKind; readonly name: string; readonly content: string; readonly notes: readonly string[] }
    | { readonly kind: 'blocked'; readonly reason: string };

/**
 * Keyword spellings the former parser recognized, longest first (it matched known keywords as prefixes).
 */
const FORMER_KEYWORDS: readonly string[] = COMMITMENTS.filter((definition) => definition.kind !== 'declaration' || definition.keyword === 'TASK')
    .flatMap((definition) => [definition.keyword, ...definition.aliases])
    .sort((a, b) => b.length - a.length);

/**
 * How the former parser read a line: a known keyword followed by whitespace or the end of the line.
 */
function formerMatch(line: string): { keyword: string; content: string } | undefined {
    for (const keyword of FORMER_KEYWORDS) {
        if (!line.startsWith(keyword)) continue;
        const rest = line.slice(keyword.length);
        if (rest !== '' && !/^\s/.test(rest)) continue;
        return { keyword, content: rest.trim() };
    }
    return undefined;
}

/**
 * Canonical keyword of a known spelling (alias resolved).
 */
function canonicalKeyword(written: string): string {
    return COMMITMENTS.find((definition) => definition.keyword === written || definition.aliases.includes(written))?.keyword ?? written;
}

/**
 * Commitment that receives descriptive text without an owner in former syntax.
 */
const DESCRIPTION_KEYWORD: Readonly<Record<EntityKind, string>> = { task: 'GOAL', agent: 'PERSONA', chat: 'NOTE' };

/**
 * Converts a Book in former syntax into the canonical form, preserving its name, content, links and history.
 *
 * Former syntax: a plain name line (kind from `ENTITY` or, as documented then, the conventional folder), `ENTITY`
 * lines, a `TASK <name>` header followed by an introduction, and text after one-line controls. Descriptive text without
 * an owner moves under GOAL (tasks), PERSONA (agents, where it was part of the role) or NOTE (chats); lines the new
 * boundary rule would read as commitments are escaped literally. The name is kept exactly (no new date); an ambiguous
 * kind or a name that cannot follow a keyword blocks the conversion instead of guessing.
 *
 * @private Book conversion
 */
export function convertLegacyBook(source: string, location: LegacyLocation): BookConversion {
    const document = parseBook(source);
    if (document.kind === 'empty') return { kind: 'unchanged' };
    const legacy = document.legacy;
    const formerTaskHeader = !document.declaredKind && /^TASK\s/.test(document.lines[document.headerLine] ?? '');
    if (!legacy && !formerTaskHeader) return { kind: 'unchanged' };
    if (legacy?.uppercaseName) return { kind: 'blocked', reason: `the name "${document.name}" starts with an all-uppercase word, which cannot follow a declaration keyword; choose a representable spelling (e.g. "${declarationName(document.name)}") and edit the first line explicitly` };

    // Kind: the canonical declaration, else ENTITY, else the documented folder convention.
    const header = document.lines[document.headerLine]!;
    const former = formerMatch(header);
    let entity: EntityKind | undefined = document.declaredKind ?? (former?.keyword === 'TASK' ? 'task' : undefined);
    if (legacy?.entity === 'conflict' || legacy?.entity === 'unsupported') return { kind: 'blocked', reason: 'its ENTITY declarations are contradictory or unsupported; state the kind explicitly' };
    if (legacy?.entity) {
        if (entity && entity !== legacy.entity) return { kind: 'blocked', reason: `its header declares a ${entity} but ENTITY says ${legacy.entity}` };
        entity = legacy.entity;
    }
    const folderKind: EntityKind | undefined = location === 'agents' ? 'agent' : location === 'tasks' ? 'task' : location === 'chats' ? 'chat' : undefined;
    if (!entity) entity = folderKind;
    if (!entity) return { kind: 'blocked', reason: 'its kind is unknown (no ENTITY and not in agents/, tasks/ or chats/); start it with AGENT, TASK or CHAT explicitly' };
    if (folderKind && legacy?.entity && folderKind !== legacy.entity) return { kind: 'blocked', reason: `it declares a ${legacy.entity} but lies in ${location}/; move it or state the kind explicitly` };
    const name = former?.keyword === 'TASK' && !document.declaredKind ? former.content : document.name;
    if (!name) return { kind: 'blocked', reason: 'it has no name' };
    if (declarationName(name) !== name.replace(/\s+/g, ' ').trim()) return { kind: 'blocked', reason: `the name "${name}" needs an explicit spelling decision` };

    // Re-read the body as the former parser did: only known keywords started commitments.
    const notes: string[] = [];
    const loose: string[] = [];
    const body: string[] = [];
    let fence: string | undefined;
    let section: { keyword: string; single: boolean; message: boolean } | undefined;
    let introduction = true;
    const escapeContent = (line: string, message: boolean): string => {
        // Former message bodies already used the backslash escape; other content did not.
        if (!message && line.startsWith('\\')) return `\\${line}`;
        if (!message && fenceMarker(line) === undefined && matchCommitmentKeyword(line)) return `\\${line}`;
        if (message && !line.startsWith('\\') && matchCommitmentKeyword(line)) return `\\${line}`;
        return line;
    };
    for (let index = document.headerLine + 1; index < document.lines.length; index++) {
        const line = document.lines[index]!;
        const marker = fenceMarker(line);
        const match = fence || marker ? undefined : formerMatch(line);
        if (fence) {
            if (marker && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = undefined;
        } else if (marker) fence = marker;
        if (match) {
            introduction = false;
            const keyword = canonicalKeyword(match.keyword);
            const definition = COMMITMENTS.find((item) => item.keyword === keyword)!;
            const single = definition.kind === 'control' || definition.kind === 'repeatable-control' || definition.kind === 'flag' || definition.kind === 'historical';
            section = { keyword, single, message: keyword === 'CHAT MESSAGE' };
            if (keyword === 'ENTITY') {
                notes.push('removed the redundant ENTITY declaration');
                continue;
            }
            if (keyword === 'TASK') {
                // A later legacy `TASK …` line never declared anything; keep its text as content.
                loose.push(match.content);
                continue;
            }
            const reread = matchCommitmentKeyword(line);
            if (reread && !reread.definition.unknown && reread.definition.keyword === keyword && reread.content === match.content) body.push(line);
            else body.push(...renderCommitment(match.keyword, match.content));
            continue;
        }
        if (introduction || section?.single) {
            if (line.trim() || loose.length) loose.push(fence || marker ? line : line);
            continue;
        }
        body.push(fence || marker ? line : escapeContent(line, Boolean(section?.message)));
    }
    while (loose.length && !loose[loose.length - 1]!.trim()) loose.pop();
    const description = loose.join('\n').trim();
    const lines = [`${DECLARATION_KEYWORD[entity]} ${name.replace(/\s+/g, ' ').trim()}`];
    if (description) {
        lines.push(...renderCommitment(DESCRIPTION_KEYWORD[entity], description));
        notes.push(`moved descriptive text under ${DESCRIPTION_KEYWORD[entity]}`);
    }
    while (body.length && !body[0]!.trim()) body.shift();
    if (body.length && entity !== 'chat' && description) lines.push('');
    lines.push(...body);
    while (lines.length && !lines[lines.length - 1]!.trim()) lines.pop();
    const content = `${lines.join(document.newline)}${document.newline}`;
    const check = parseBook(content);
    if (check.kind !== entity || check.name !== name.replace(/\s+/g, ' ').trim()) {
        return { kind: 'blocked', reason: `the converted Book would not read back as the same ${entity} (${check.diagnostics.map((diagnostic) => diagnostic.message).join(' ')})` };
    }
    return { kind: 'converted', entity, name: check.name, content, notes };
}
