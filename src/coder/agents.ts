import { readFile, realpath, readdir } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/** A resolved advisor declaration retains the file that declared its relative reference. @private */
export interface TeamMember { name: string; path: string; declaringPath: string; }

/** Immutable Book snapshot used for one inference attempt. @private */
export interface PreparedAgent { instructions: string; aliases: string[]; team: TeamMember[]; model?: string; modelParameters?: Record<string, string>; }

/** A lexical commitment, including its declaring source. @private */
interface Commitment { keyword: string; value: string; source: string; }

/** Known multi-line Book commitments; code fences remain literal content. @private */
const COMMITMENTS = /^(PERSONAE?|GOALS?|RULES?|STYLES?|LANGUAGES?|WRITING SAMPLE|WRITING RULES?|SAMPLES?|EXAMPLES?|FORMATS?|TEMPLATES?|FROM|IMPORTS?|KNOWLEDGE|TEAM|MODELS?|META (?:INPUT PLACEHOLDER|IMAGE|AVATAR|VISUAL|COLOR|FONT|LINK|DOMAIN|DISCLAIMER|VISIBILITY|VOICE|DESCRIPTION|FULLNAME|ID|EMAIL)|NOTES?|COMMENTS?|NONCE|TODO|CLOSED|OPEN|DELETE|CANCEL|DISCARD|REMOVE|CONTEXT|EXPECT|BEHAVIOURS?|AVOID(?:ANCE)?|MESSAGE(?: SUFFIX)?|INITIAL MESSAGE|DICTIONARY|USE (?:USER LOCATION|CALENDAR|POPUP|IMAGE GENERATOR|MCP|PRIVACY|PROJECT)|ACTIONS?)\b[ \t]*(.*)$/i;

/** Parse Book commitments without I/O or interpreting fenced uppercase text. @private */
function parseBook(text: string, source: string): { name: string; commitments: Commitment[] } {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
    const first = lines.findIndex((line) => line.trim().length > 0);
    if (first < 0) throw new Error(`Agent Book is empty: ${source}`);
    if (/^TASK\b/i.test(lines[first]!)) throw new Error(`Task Book cannot be used as an agent: ${source}`);
    const name = lines[first]!.trim();
    const commitments: Commitment[] = [];
    let current: Commitment | undefined;
    let fence: string | undefined;
    for (const line of lines.slice(first + 1)) {
        const opening = /^\s*(`{3,}|~{3,})/.exec(line);
        if (opening) {
            if (!fence) fence = opening[1]![0];
            else if (opening[1]![0] === fence) fence = undefined;
            if (!current) commitments.push(current = { keyword: 'PERSONA', value: '', source });
            current.value += `\n${line}`;
            continue;
        }
        const match = !fence && COMMITMENTS.exec(line);
        if (!fence && /^TASK(?:\s|$)/.test(line)) throw new Error(`Task Book cannot be used as an agent: ${source}`);
        if (match) {
            current = { keyword: match[1]!.toUpperCase().replace(/^(IMPORT|RULE|STYLE|GOAL|FORMAT|TEMPLATE|LANGUAGE|PERSONA)S?$/, '$1'), value: match[2]!, source };
            commitments.push(current);
        } else if (line.trim() || current) {
            if (!current) commitments.push(current = { keyword: 'PERSONA', value: '', source });
            current.value += `\n${line}`;
        }
    }
    return { name, commitments };
}

/** Test workspace membership after resolving filesystem aliases. @private */
function within(root: string, target: string): boolean {
    const part = relative(root, target);
    return part === '' || (part !== '..' && !part.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(part));
}

/** Resolve a local file without allowing a symlink to escape the selected project. @private */
export async function agentLocalPath(path: string, projectPath: string): Promise<string> {
    const root = await realpath(projectPath);
    const target = await realpath(resolve(projectPath, path));
    if (!within(root, target)) throw new Error(`Agent/knowledge reference escapes project: ${path}`);
    return target;
}

/** Recognize public-network exclusions, including IPv4-mapped IPv6 literals. @private */
export function isPrivateBookAddress(address: string): boolean {
    const normalized = address.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0]!;
    if (isIP(normalized) === 4) return /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(normalized);
    if (isIP(normalized) !== 6) return false;
    const halves = normalized.split('::');
    const before = halves[0] ? halves[0].split(':') : [];
    const after = halves[1] ? halves[1].split(':') : [];
    const dotted = [...before, ...after].find((part) => part.includes('.'));
    const parts = dotted ? normalized.replace(dotted, dotted.split('.').map(Number).reduce((text, value, index, values) => index % 2 ? text : `${text}${text ? ':' : ''}${((value << 8) | values[index + 1]!).toString(16)}`, '')) : normalized;
    const [left, right] = parts.split('::');
    const start = left ? left.split(':') : [];
    const end = right ? right.split(':') : [];
    const words = [...start, ...Array(parts.includes('::') ? 8 - start.length - end.length : 0).fill('0'), ...end].map((word) => parseInt(word, 16));
    if (words.length !== 8) return true;
    if (words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff) return isPrivateBookAddress(`${words[6]! >> 8}.${words[6]! & 255}.${words[7]! >> 8}.${words[7]! & 255}`);
    return words.every((word) => word === 0) || (words.slice(0, 7).every((word) => word === 0) && words[7] === 1) || (words[0]! & 0xfe00) === 0xfc00 || (words[0]! & 0xffc0) === 0xfe80;
}

/** Reject local/private network sources and credential-bearing URLs. @private */
async function remoteUrl(reference: string): Promise<URL> {
    const url = new URL(reference);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`Remote Books require public HTTPS without embedded credentials: ${url.origin}`);
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
    if (addresses.some(({ address }) => isPrivateBookAddress(address))) throw new Error(`Remote Book cannot access a private host: ${url.hostname}`);
    return url;
}

/** Read bounded textual content; never send host credentials to remote Books. @private */
async function sourceText(source: string): Promise<string> {
    if (!/^https:/i.test(source)) {
        const bytes = await readFile(source);
        if (bytes.length > 2 * 1024 * 1024 || bytes.includes(0)) throw new Error(`Book/knowledge must be bounded text: ${source}`);
        return bytes.toString('utf8');
    }
    const url = await remoteUrl(source);
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: 'error', credentials: 'omit' });
    if (!response.ok) throw new Error(`Cannot load remote Book ${url.origin}${url.pathname}: HTTP ${response.status}`);
    if (Number(response.headers.get('content-length') || 0) > 2 * 1024 * 1024) throw new Error('Remote Book exceeds 2 MiB');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Remote Book has no body');
    let size = 0;
    const parts: Uint8Array[] = [];
    for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 2 * 1024 * 1024) { await reader.cancel(); throw new Error('Remote Book exceeds 2 MiB'); }
        parts.push(chunk.value);
    }
    const bytes = Buffer.concat(parts);
    if (bytes.includes(0)) throw new Error('Remote knowledge requires a text resource');
    return bytes.toString('utf8');
}

/** Scan only local agent Books for exact display-name resolution. @private */
async function namedBooks(projectPath: string, name: string): Promise<string[]> {
    const result: string[] = [];
    /** Walk agent definitions, retaining workspace boundaries for symlinks. */
    async function walk(directory: string): Promise<void> {
        let entries;
        try { entries = await readdir(directory, { withFileTypes: true }); } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
            throw error;
        }
        for (const entry of entries) {
            const path = resolve(directory, entry.name);
            if (entry.isDirectory()) await walk(path);
            else if (entry.name.endsWith('.book')) {
                const safePath = await agentLocalPath(path, projectPath);
                if (parseBook(await sourceText(safePath), safePath).name === name) result.push(safePath);
            }
        }
    }
    await walk(resolve(projectPath, 'agents'));
    return result;
}

/** Resolve references against their declaring Book, not the primary agent. @private */
async function resolveReference(raw: string, declaring: string, projectPath: string): Promise<string> {
    const reference = raw.trim().replace(/^\{(.*)\}$/, '$1').replace(/^["']|["']$/g, '');
    if (/^https?:/i.test(reference)) return (await remoteUrl(reference)).href;
    if (/^https:/i.test(declaring)) {
        if (/^(?:\/|file:|[A-Za-z]:\\)/.test(reference)) throw new Error(`Remote Book cannot reference the host filesystem: ${declaring}`);
        if (!reference.endsWith('.book') && !reference.includes('/')) throw new Error(`Remote Book must use an explicit remote TEAM URL: ${declaring}`);
        return (await remoteUrl(new URL(reference, declaring).href)).href;
    }
    if (reference.includes('/') || reference.endsWith('.book') || reference.startsWith('.')) return agentLocalPath(resolve(dirname(declaring), reference), projectPath);
    const matches = await namedBooks(projectPath, reference);
    if (matches.length !== 1) throw new Error(`${declaring}: reference {${reference}} is ${matches.length ? 'ambiguous' : 'missing'}${matches.length ? ` (${matches.join(', ')})` : ''}`);
    return matches[0]!;
}

/** Compile persona, local/remote inheritance, knowledge and distinct advisor tools. @private */
export async function prepareAgent(agentPath: string, projectPath: string): Promise<PreparedAgent> {
    projectPath = await realpath(projectPath);
    const primary = /^https:/i.test(agentPath) ? (await remoteUrl(agentPath)).href : await agentLocalPath(agentPath, projectPath);
    const stack = new Set<string>();
    const aliases = new Set<string>();
    const team = new Map<string, TeamMember>();
    /** Expand immutable source snapshots and reject inheritance cycles. */
    async function expand(path: string, primaryBook = false): Promise<Commitment[]> {
        if (stack.has(path)) throw new Error(`Cyclic Book inheritance: ${[...stack, path].join(' -> ')}`);
        if (stack.size >= 32) throw new Error(`Book inheritance exceeds 32 levels: ${path}`);
        stack.add(path);
        const parsed = parseBook(await sourceText(path), path);
        const finalFrom = parsed.commitments.filter((part) => part.keyword === 'FROM').at(-1);
        if (primaryBook) { aliases.add(parsed.name); aliases.add(basename(path, '.book')); aliases.add(path); }
        const expanded: Commitment[] = [];
        if (!parsed.commitments.some((part) => part.keyword === 'FROM') && !/^https:/.test(path)) {
            const adam = resolve(projectPath, 'agents/.core/adam.book');
            if (path !== adam) {
                try { expanded.push(...await expand(await agentLocalPath(adam, projectPath))); } catch (error) {
                    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
                }
            }
        }
        for (const part of parsed.commitments) {
            if (part.keyword === 'FROM' || part.keyword === 'IMPORT') {
                if (part.keyword === 'FROM' && part !== finalFrom) continue;
                if (part.keyword === 'FROM' && /^(?:\{?(?:VOID|NULL)\}?)?$/i.test(part.value.trim())) continue;
                expanded.push(...await expand(await resolveReference(part.value, path, projectPath)));
            } else expanded.push(part);
        }
        stack.delete(path);
        return expanded;
    }
    const parts = await expand(primary, true);
    const instructions: string[] = [];
    let model: string | undefined;
    const modelParameters: Record<string, string> = {};
    for (const part of parts) {
        if (part.keyword === 'TEAM') {
            const references = [...part.value.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]!);
            if (!references.length && part.value.trim()) references.push(part.value.trim());
            for (const reference of references) {
                const path = await resolveReference(reference, part.source, projectPath);
                const name = parseBook(await sourceText(path), path).name;
                if ([...team.values()].some((member) => member.name === name && member.path !== path)) throw new Error(`${part.source}: TEAM advisor name ${name} is ambiguous`);
                team.set(path, { name, path, declaringPath: part.source });
            }
        } else if (part.keyword === 'KNOWLEDGE') {
            const value = part.value.trim();
            const fileLike = /^(https?:|\.\.?[\/]|\/)|\.(?:md|txt|book|json|csv|ts|js|html)$/i.test(value);
            const content = fileLike ? await sourceText(await resolveReference(value, part.source, projectPath)) : value;
            instructions.push(`KNOWLEDGE (from ${part.source}):\n${content}`);
        } else if (part.keyword === 'MODEL' || part.keyword === 'MODELS') {
            for (const line of part.value.split('\n').map((value) => value.trim()).filter(Boolean)) {
                const named = /^(NAME|TEMPERATURE|TOP_P|TOP_K|MAX_TOKENS|SEED)\s+(.+)$/i.exec(line);
                if (named && named[1]!.toUpperCase() !== 'NAME') modelParameters[named[1]!.toUpperCase()] = named[2]!;
                else {
                    const name = (named?.[2] || line).trim();
                    if (!name || /\s/.test(name)) throw new Error(`Invalid MODEL name in ${part.source}: expected one provider model identifier`);
                    model = name;
                }
            }
        } else if (/^META /.test(part.keyword)) {
            if (part.keyword === 'META FULLNAME') aliases.add(part.value.trim());
        } else if (/^(NOTE|NOTES|COMMENT|COMMENTS|NONCE|TODO|CLOSED|OPEN|MODEL|MODELS)$/.test(part.keyword)) continue;
        else if (/^(USE |ACTION|DELETE|CANCEL|DISCARD|REMOVE)/.test(part.keyword)) throw new Error(`Unsupported agent capability ${part.keyword} in ${part.source}; configure an explicit harness capability instead`);
        else instructions.push(`${part.keyword} ${part.value.trim()}`);
    }
    return { instructions: instructions.join('\n\n'), aliases: [...aliases], team: [...team.values()], ...(model ? { model } : {}), ...(Object.keys(modelParameters).length ? { modelParameters } : {}) };
}
