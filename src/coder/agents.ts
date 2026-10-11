import { readFile, realpath, readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/** A resolved advisor declaration retains the file that declared its relative reference. @private */
export interface TeamMember { name: string; path: string; declaringPath: string; kind?: 'agent' | 'expert' | 'user' | 'void'; }

/** Learning permission belongs to the local Book, independently of its ancestors. @private */
export interface LearningPolicy { open: boolean; limits?: string; }

/** A discovered project identity, including hidden supporting definitions. @private */
export interface AgentDefinition { name: string; normalizedName: string; path: string; hidden: boolean; learning: LearningPolicy; }

/** Immutable Book snapshot used for one inference attempt. @private */
export interface PreparedAgent { name: string; path: string; instructions: string; aliases: string[]; team: TeamMember[]; learning: LearningPolicy; sources: Record<string, string>; model?: string; modelParameters?: Record<string, string>; }

/** A lexical commitment, including its declaring source. @private */
interface Commitment { keyword: string; value: string; source: string; line: number; }

/** Known multi-line Book commitments; code fences remain literal content. @private */
const COMMITMENTS = /^(PERSONAE?|GOALS?|RULES?|STYLES?|LANGUAGES?|WRITING SAMPLE|WRITING RULES?|SAMPLES?|EXAMPLES?|FORMATS?|TEMPLATES?|FROM|IMPORTS?|KNOWLEDGE|TEAM|MODELS?|META (?:INPUT PLACEHOLDER|IMAGE|AVATAR|VISUAL|COLOR|FONT|LINK|DOMAIN|DISCLAIMER|VISIBILITY|VOICE|DESCRIPTION|FULLNAME|ID|EMAIL)|NOTES?|COMMENTS?|NONCE|TODO|CLOSED|OPEN|DELETE|CANCEL|DISCARD|REMOVE|CONTEXT|EXPECT|BEHAVIOURS?|AVOID(?:ANCE)?|MESSAGE(?: SUFFIX)?|INITIAL MESSAGE|DICTIONARY|USE (?:USER LOCATION|CALENDAR|POPUP|IMAGE GENERATOR|MCP|PRIVACY|PROJECT)|ACTIONS?)(?:[ \t]+(.*)|$)/;

/** Missing core definitions are created from these installed-engine defaults only. @private */
export const CORE_BOOKS: Readonly<Record<string, string>> = {
    adam: 'Adam\n\nFROM Void\nPERSONA A careful project agent.\nRULE Follow project instructions, preserve existing work and report only evidence actually available.\nRULE Promptbook owns task claiming, checks and Git completion; do not commit or claim other tasks.\n',
    manager: 'Manager\n\nGOAL Assign work to suitable available project agents and authorized harnesses.\nRULE Respect task restrictions and available capabilities. Never invent a model, authentication or permission.\nRULE Provide the requested structured assignment without executing the assigned task.\nCLOSED\n',
    teacher: 'Teacher\n\nFROM Expert\nGOAL Improve an open agent Book using evidence from its completed work.\nRULE Re-read the target Book and its learning policy before changing it. If it is now CLOSED, make no change.\nRULE Preserve instruction provenance and learning limits. Never change OPEN/CLOSED limits, increase permissions or weaken checks.\nRULE Private reasoning unavailable from the harness is unavailable evidence; never invent it.\nCLOSED\n',
};

/** Normalize identity across case, diacritics, separators and camel case. @private */
export function normalizeAgentName(name: string): string {
    return name.trim().replace(/^@/, '').replace(/^\{(.*)\}$/, '$1').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[øłðđ]/g, (letter) => ({ ø: 'o', ł: 'l', ð: 'd', đ: 'd' }[letter]!)).replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ß/g, 'ss').replace(/þ/g, 'th').replace(/[^\p{L}\p{N}]/gu, '');
}

/** Resolve engine-owned identities without consulting or materializing project files. @private */
export function nonAgentReference(reference: string): { name: string; path: string; kind: 'expert' | 'user' | 'void' } | undefined {
    const identity = normalizeAgentName(reference.replace(/^ptbk:/, ''));
    if (['void', 'null', '0'].includes(identity)) return { name: 'Void', path: 'ptbk:void', kind: 'void' };
    if (identity === 'user') return { name: 'User', path: 'ptbk:user', kind: 'user' };
    if (identity === 'expert') return { name: 'Expert', path: 'ptbk:expert', kind: 'expert' };
    return undefined;
}

/** Require a local learning declaration to be the final commitment. @private */
function learningPolicy(parts: Commitment[], source: string): LearningPolicy {
    const policies = parts.filter((part) => part.keyword === 'OPEN' || part.keyword === 'CLOSED');
    if (policies.length > 1) throw new Error(`${source}:${policies[1]!.line}: conflicting OPEN/CLOSED learning declarations`);
    if (policies.length && parts.at(-1) !== policies[0]) throw new Error(`${source}:${policies[0]!.line}: OPEN/CLOSED must be the final commitment`);
    const policy = policies[0];
    return { open: policy?.keyword !== 'CLOSED', ...(policy?.keyword === 'OPEN' && policy.value.trim() ? { limits: policy.value.trim() } : {}) };
}

/** Parse Book commitments without I/O or interpreting fenced uppercase text. @private */
function parseBook(text: string, source: string): { name: string; commitments: Commitment[] } {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
    const first = lines.findIndex((line) => line.trim().length > 0);
    if (first < 0) throw new Error(`Agent Book is empty: ${source}`);
    if (/^TASK\b/.test(lines[first]!)) throw new Error(`Task Book cannot be used as an agent: ${source}`);
    const name = lines[first]!.trim();
    const commitments: Commitment[] = [];
    let current: Commitment | undefined;
    let fence: string | undefined;
    for (const [index, line] of lines.slice(first + 1).entries()) {
        const opening = /^\s*(`{3,}|~{3,})/.exec(line);
        if (opening) {
            if (!fence) fence = opening[1]!;
            else if (opening[1]![0] === fence[0] && opening[1]!.length >= fence.length) fence = undefined;
            if (!current) commitments.push(current = { keyword: 'PERSONA', value: '', source, line: first + index + 2 });
            current.value += `\n${line}`;
            continue;
        }
        const match = !fence && COMMITMENTS.exec(line);
        if (!fence && /^TASK(?:\s|$)/.test(line)) throw new Error(`Task Book cannot be used as an agent: ${source}`);
        if (match) {
            const keyword = match[1]!.replace(/^(IMPORT|RULE|STYLE|GOAL|FORMAT|TEMPLATE|LANGUAGE|SAMPLE|MODEL|ACTION|NOTE|COMMENT)S$/, '$1').replace(/^PERSONAE$/, 'PERSONA').replace(/^(CANCEL|DISCARD|REMOVE)$/, 'DELETE');
            current = { keyword, value: match[2] || '', source, line: first + index + 2 };
            commitments.push(current);
        } else if (line.trim() || current) {
            if (!current) commitments.push(current = { keyword: 'PERSONA', value: '', source, line: first + index + 2 });
            current.value += `\n${line}`;
        }
    }
    learningPolicy(commitments, source);
    const parents = commitments.filter((part) => part.keyword === 'FROM');
    if (parents.length > 1) throw new Error(`${source}:${parents[1]!.line}: conflicting FROM declarations; an agent has one parent`);
    if (parents[0] && !parents[0].value.trim()) throw new Error(`${source}:${parents[0].line}: FROM requires a parent; use FROM Void to end inheritance`);
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

/** Discover canonical identities recursively, rejecting every ambiguity before selection. @private */
export async function discoverAgents(projectPath: string): Promise<AgentDefinition[]> {
    projectPath = await realpath(projectPath);
    const result: AgentDefinition[] = [];
    const identities = new Map<string, AgentDefinition>();
    const visited = new Map<string, boolean>();
    const files = new Set<string>();
    /** Walk hidden and ordinary folders without following aliases outside the workspace. */
    async function walk(directory: string, hidden: boolean): Promise<void> {
        let safe: string;
        try { safe = await agentLocalPath(directory, projectPath); }
        catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
        if (visited.has(safe) && (!visited.get(safe) || hidden)) return;
        visited.set(safe, hidden);
        const entries = (await readdir(safe, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
            const path = await agentLocalPath(resolve(safe, entry.name), projectPath);
            const attributes = entry.isSymbolicLink() ? await stat(path) : entry;
            if (attributes.isDirectory()) await walk(path, hidden || entry.name.startsWith('.'));
            else if (files.has(path) && !hidden) { const existing = result.find((agent) => agent.path === path); if (existing) existing.hidden = false; }
            else if (attributes.isFile() && entry.name.endsWith('.book') && !files.has(path)) {
                files.add(path);
                const parsed = parseBook(await sourceText(path), path);
                const normalizedName = normalizeAgentName(parsed.name);
                if (!normalizedName) throw new Error(`${path}: agent name has no usable identity`);
                if (nonAgentReference(parsed.name)) throw new Error(`${path}: reserved non-agent identity ${parsed.name} cannot be a project Book`);
                const agent = { name: parsed.name, normalizedName, path, hidden, learning: learningPolicy(parsed.commitments, path) };
                const previous = identities.get(normalizedName);
                if (previous) throw new Error(`Ambiguous normalized agent name ${parsed.name}: ${previous.path} and ${path}`);
                identities.set(normalizedName, agent);
                result.push(agent);
            }
        }
    }
    await walk(resolve(projectPath, 'agents'), false);
    const teacher = result.find((agent) => agent.normalizedName === 'teacher');
    if (teacher?.learning.open) throw new Error(`${teacher.path}: Teacher must end in CLOSED to prevent a self-teaching loop`);
    return result;
}

/** Repair missing core definitions individually; existing custom Books are never overwritten. @private */
export async function ensureCoreAgents(projectPath: string): Promise<string[]> {
    projectPath = await realpath(projectPath);
    const changed: string[] = [];
    const { confinePath } = await import('./workspace.js');
    const directory = await confinePath(projectPath, resolve(projectPath, 'agents/.core'));
    await mkdir(directory, { recursive: true });
    for (const [role, content] of Object.entries(CORE_BOOKS)) {
        const path = await confinePath(projectPath, resolve(directory, `${role}.book`));
        try { await writeFile(path, content, { flag: 'wx' }); changed.push(path); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
        const parsed = parseBook(await sourceText(path), path);
        if (normalizeAgentName(parsed.name) !== role) throw new Error(`${path}: required core Book must be named ${role}`);
    }
    await discoverAgents(projectPath);
    return changed;
}

/** Resolve a shared identity from its declaring Book; filenames never override name uniqueness. @private */
export async function resolveAgentReference(raw: string, declaring: string, projectPath: string): Promise<string> {
    const reference = raw.trim().replace(/^\{(.*)\}$/, '$1').replace(/^["']|["']$/g, '').replace(/^@/, '');
    const nonAgent = nonAgentReference(reference);
    if (nonAgent) return nonAgent.path;
    if (/^https?:/i.test(reference)) return (await remoteUrl(reference)).href;
    if (/^https:/i.test(declaring)) {
        if (/^(?:\/|file:|[A-Za-z]:\\)/.test(reference)) throw new Error(`Remote Book cannot reference the host filesystem: ${declaring}`);
        if (!reference.endsWith('.book') && !reference.includes('/')) throw new Error(`Remote Book must use an explicit remote reference: ${declaring}`);
        return (await remoteUrl(new URL(reference, declaring).href)).href;
    }
    const agents = await discoverAgents(projectPath);
    if (reference.includes('/') || reference.includes('\\') || reference.endsWith('.book') || reference.startsWith('.')) {
        const target = await agentLocalPath(resolve(dirname(declaring), reference), projectPath);
        parseBook(await sourceText(target), target);
        return target;
    }
    const matches = agents.filter((agent) => agent.normalizedName === normalizeAgentName(reference));
    if (matches.length !== 1) throw new Error(`${declaring}: reference {${reference}} is ${matches.length ? 'ambiguous' : 'missing'}`);
    return matches[0]!.path;
}

/** Introspect this installed engine without exposing credentials or project-owned Expert files. @private */
async function expertBook(projectPath: string): Promise<string> {
    const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };
    return `Expert
FROM Void
PERSONA Promptbook expertise supplied by the running ptbk ${manifest.version} engine.
KNOWLEDGE APT means Agent–Project–Task. An agent is a persistent role; a task is bounded work. This project is ${projectPath}. Runtime records and persistent browser sessions are Git-ignored in .ptbk/.
KNOWLEDGE Agent names are first nonempty Book lines, unique after case/diacritic/separator normalization. FROM inherits Adam by default; FROM Void terminates; FROM User is invalid; IMPORT includes instructions in place; TEAM @Name and {Multi Word Name} make on-demand consultations, including @User and @Expert.
KNOWLEDGE Core agents are editable Adam, Manager and closed Teacher in agents/.core/. Hidden agents remain resolvable but do not receive ordinary automatic work. Expert, User and Void are engine references without editable project files.
KNOWLEDGE Task Books start TASK followed by a title; TASK ID, TASK AGENT, TASK HARNESS, TASK MODEL, TASK THINKING LEVEL, TASK PRIORITY, TASK AFTER, TASK DUE DATE, TASK REPEAT, TASK DEPENDS ON, TASK PARENT, TASK STATUS, TASK DONE and TASK ORIGIN describe bounded work. Natural prose and fenced examples remain payload. Completion stamps record actual checked work and Git results.
KNOWLEDGE ptbk init prepares files and Git; start operates indefinitely; run is finite; list is read-only; add saves a task without a model call; plan discusses read-only and saves reviewed tasks. The engine owns checks, recovery, task completion and commits. Human requests are durable and answerable through terminal, CLI and localhost HTTP interfaces.
RULE Observe actual installed harness capabilities, authentication and model catalogs. Do not invent tool support, account permission, validation success, private reasoning or external evidence.
RULE Preserve existing project content. Agenda bootstrap creates useful project agents, checks and initial tasks from the user's intent. Use real checks; unresolved setup is a visible requirement.
CLOSED
`;
}

/** Extract explicit TEAM identities from natural prose without treating the whole sentence as a name. */
function teamReferences(value: string): string[] {
    const references = [...value.matchAll(/\{([^{}]+)\}|@([\p{L}\p{N}_.-]+)/gu)].map((match) => (match[1] || match[2])!.replace(/[.,;:!?]+$/, ''));
    if (!references.length && value.trim() && /^(?:[\p{L}\p{N}_ .-]+|\.?\.?[\\/].+\.book|https:\/\/\S+)$/u.test(value.trim())) references.push(value.trim());
    return references;
}

/** Extract the final inherited MODEL settings using one parser for execution and read-only routing. */
function modelConfiguration(parts: Commitment[]): { model?: string; modelParameters?: Record<string, string> } {
    let model: string | undefined;
    const modelParameters: Record<string, string> = {};
    for (const part of parts.filter(part => part.keyword === 'MODEL')) {
        for (const line of part.value.split('\n').map(value => value.trim()).filter(Boolean)) {
            const named = /^(NAME|TEMPERATURE|TOP_P|TOP_K|MAX_TOKENS|SEED)\s+(.+)$/.exec(line);
            if (named && named[1] !== 'NAME') modelParameters[named[1]!] = named[2]!;
            else {
                const name = (named?.[2] || line).trim();
                if (!name || /\s/.test(name)) throw new Error(`Invalid MODEL name in ${part.source}: expected one provider model identifier`);
                model = name;
            }
        }
    }
    return { ...(model ? { model } : {}), ...(Object.keys(modelParameters).length ? { modelParameters } : {}) };
}

/** Resolve an inherited local MODEL without network, knowledge reads, setup or advisor calls. @private */
export async function readLocalAgentModel(agentPath: string, projectPath: string): Promise<string | undefined> {
    if (/^https?:/i.test(agentPath) || nonAgentReference(agentPath)) return undefined;
    const agents = await discoverAgents(projectPath);
    const defaultAdam = 'ptbk:default-adam';
    const stack = new Set<string>();
    /** Name and path resolution deliberately leaves remote dependencies unknown without DNS or fetch. */
    async function referencePath(raw: string, declaring: string): Promise<string | undefined> {
        const reference = raw.trim().replace(/^\{(.*)\}$/, '$1').replace(/^["']|["']$/g, '').replace(/^@/, '');
        if (/^https?:/i.test(reference)) return undefined;
        const special = nonAgentReference(reference);
        if (special) return special.path;
        if (reference.includes('/') || reference.includes('\\') || reference.endsWith('.book') || reference.startsWith('.')) return agentLocalPath(resolve(dirname(declaring), reference), projectPath);
        const matches = agents.filter(agent => agent.normalizedName === normalizeAgentName(reference));
        if (!matches.length && normalizeAgentName(reference) === 'adam') return defaultAdam;
        if (matches.length !== 1) throw new Error(`${declaring}: reference {${reference}} is ${matches.length ? 'ambiguous' : 'missing'}`);
        return matches[0]!.path;
    }
    /** Apply local FROM, IMPORT and DELETE in the same order as actual instruction preparation. */
    async function expand(path: string): Promise<Commitment[] | undefined> {
        const special = nonAgentReference(path);
        if (special?.kind === 'void' || special?.kind === 'expert') return [];
        if (special?.kind === 'user') throw new Error(`${path}: FROM/IMPORT User is invalid; use TEAM @User`);
        if (stack.has(path)) throw new Error(`Cyclic Book inheritance/inclusion: ${[...stack, path].join(' -> ')}`);
        if (stack.size >= 32) throw new Error(`Book inheritance exceeds 32 levels: ${path}`);
        stack.add(path);
        const parsed = parseBook(path === defaultAdam ? CORE_BOOKS.adam! : await readFile(path, 'utf8'), path);
        const parent = parsed.commitments.find(part => part.keyword === 'FROM');
        const parentPath = await referencePath(parent?.value || 'Adam', path);
        if (!parentPath) return undefined;
        const expanded = await expand(parentPath);
        if (!expanded) return undefined;
        for (const part of parsed.commitments) {
            if (part.keyword === 'FROM') continue;
            if (part.keyword === 'IMPORT') {
                const imported = await referencePath(part.value, path);
                if (!imported) return undefined;
                const included = await expand(imported);
                if (!included) return undefined;
                expanded.push(...included);
            } else if (part.keyword === 'DELETE') {
                const target = part.value.trim();
                const matches = expanded.map((entry, index) => ({ entry, index })).filter(({ entry }) => `${entry.keyword} ${entry.value.trim()}` === target || entry.value.trim() === target);
                if (matches.length !== 1) throw new Error(`${part.source}:${part.line}: DELETE target is ${matches.length ? 'ambiguous' : 'missing'}: ${target}`);
                expanded.splice(matches[0]!.index, 1);
            } else if (part.keyword !== 'OPEN' && part.keyword !== 'CLOSED') expanded.push(part);
        }
        stack.delete(path);
        return expanded;
    }
    const parts = await expand(await agentLocalPath(agentPath, projectPath));
    const model = parts ? modelConfiguration(parts).model : undefined;
    return model === 'default' ? undefined : model;
}

/** Compile immutable instruction provenance, inheritance, knowledge and distinct TEAM tools. @private */
export async function prepareAgent(agentPath: string, projectPath: string): Promise<PreparedAgent> {
    projectPath = await realpath(projectPath);
    await discoverAgents(projectPath);
    const special = nonAgentReference(agentPath);
    if (special?.kind === 'user') throw new Error('User is a human consultation reference, not an execution agent or inheritance parent');
    const primary = special ? special.path : /^https:/i.test(agentPath) ? (await remoteUrl(agentPath)).href : await agentLocalPath(agentPath, projectPath);
    const stack = new Set<string>();
    const sources: Record<string, string> = {};
    const team = new Map<string, TeamMember>();
    let primaryName = special?.name || '';
    let learning: LearningPolicy = { open: false };
    /** Expand snapshots once per source and retain origin through inheritance and imports. */
    async function expand(path: string, primaryBook = false): Promise<Commitment[]> {
        const nonAgent = nonAgentReference(path);
        if (nonAgent?.kind === 'void') return [];
        if (nonAgent?.kind === 'user') throw new Error(`${[...stack].at(-1) || path}: FROM/IMPORT User is invalid; use TEAM @User`);
        if (stack.has(path)) throw new Error(`Cyclic Book inheritance/inclusion: ${[...stack, path].join(' -> ')}`);
        if (stack.size >= 32) throw new Error(`Book inheritance exceeds 32 levels: ${path}`);
        stack.add(path);
        const text = sources[path] ?? (nonAgent?.kind === 'expert' ? await expertBook(projectPath) : await sourceText(path));
        sources[path] = text;
        const parsed = parseBook(text, path);
        if (primaryBook) { primaryName = parsed.name; learning = nonAgent ? { open: false } : learningPolicy(parsed.commitments, path); }
        const parent = parsed.commitments.find((part) => part.keyword === 'FROM');
        const expanded: Commitment[] = [];
        if (parent) expanded.push(...await expand(await resolveAgentReference(parent.value, path, projectPath)));
        else expanded.push(...await expand(await resolveAgentReference('Adam', path, projectPath)));
        for (const part of parsed.commitments) {
            if (part.keyword === 'FROM') continue;
            if (part.keyword === 'IMPORT') expanded.push(...await expand(await resolveAgentReference(part.value, path, projectPath)));
            else if (part.keyword === 'DELETE') {
                const target = part.value.trim();
                const matches = expanded.map((entry, index) => ({ entry, index })).filter(({ entry }) => `${entry.keyword} ${entry.value.trim()}` === target || entry.value.trim() === target);
                if (matches.length !== 1) throw new Error(`${part.source}:${part.line}: DELETE target is ${matches.length ? 'ambiguous' : 'missing'}: ${target}`);
                expanded.splice(matches[0]!.index, 1);
            } else if (part.keyword !== 'OPEN' && part.keyword !== 'CLOSED') expanded.push(part);
        }
        stack.delete(path);
        return expanded;
    }
    const parts = await expand(primary, true);
    const instructions: string[] = [];
    for (const part of parts) {
        if (part.keyword === 'TEAM') {
            instructions.push(`TEAM (from ${part.source}:${part.line}) ${part.value.trim()}`);
            for (const reference of teamReferences(part.value)) {
                const path = await resolveAgentReference(reference, part.source, projectPath);
                const nonAgent = nonAgentReference(path);
                if (nonAgent?.kind === 'void') continue;
                const name = nonAgent?.name || parseBook(await sourceText(path), path).name;
                team.set(path, { name, path, declaringPath: part.source, kind: nonAgent?.kind || 'agent' });
            }
        } else if (part.keyword === 'KNOWLEDGE') {
            const value = part.value.trim();
            const fileLike = /^(https?:|\.\.?[\/]|\/)|\.(?:md|txt|book|json|csv|ts|js|html)$/i.test(value);
            let content = value;
            if (fileLike) {
                const path = /^https:/i.test(value) ? (await remoteUrl(value)).href : /^https:/i.test(part.source) ? (await remoteUrl(new URL(value, part.source).href)).href : await agentLocalPath(resolve(dirname(part.source), value), projectPath);
                content = sources[path] ?? await sourceText(path);
                sources[path] = content;
            }
            instructions.push(`KNOWLEDGE (from ${part.source}:${part.line}):\n${content}`);
        } else if (part.keyword === 'MODEL' || /^META |^(NOTE|COMMENT|NONCE|TODO)$/.test(part.keyword)) continue;
        else if (/^USE /.test(part.keyword)) throw new Error(`Unsupported agent capability ${part.keyword} in ${part.source}; configure an explicit harness capability instead`);
        else instructions.push(`${part.keyword} (from ${part.source}:${part.line}) ${part.value.trim()}`);
    }
    return { name: primaryName, path: primary, instructions: instructions.join('\n\n'), aliases: [...new Set([primaryName, normalizeAgentName(primaryName), basename(primary, '.book'), primary])], learning, sources, team: [...team.values()], ...modelConfiguration(parts) };
}

/** Validate every effective local Book before unattended execution, including hidden supporting roles. @private */
export async function validateAgents(projectPath: string): Promise<PreparedAgent[]> {
    const agents = await discoverAgents(projectPath);
    const missing = ['adam', 'manager', 'teacher'].filter((name) => !agents.some((agent) => agent.normalizedName === name));
    if (missing.length) throw new Error(`Missing required core agents: ${missing.join(', ')}. Run ptbk init or execution setup.`);
    const prepared: PreparedAgent[] = [];
    for (const agent of agents) prepared.push(await prepareAgent(agent.path, projectPath));
    return prepared;
}
