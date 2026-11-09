import { resolve } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { git } from './git.js';

/**
 * How a commit message was written: current Promptbook agent work (lowercase `ptbk: ` with a backtick-quoted agent
 * visual), a Promptbook system operation, a legacy `PTBK: ` subject, or an ordinary commit of a person or another tool.
 *
 * @private Git history
 */
export type CommitKind = 'agent' | 'system' | 'legacy' | 'foreign';

/**
 * One commit of the History page: real identity, time, topology and the original subject, with the recognized
 * presentation alongside (never replacing the original).
 *
 * @private Git history
 */
export type HistoryCommit = {
    readonly sha: string;
    readonly parents: readonly string[];
    /** Branch/tag labels pointing at it (`HEAD -> main`, `origin/main`, `tag: v1`). */
    readonly refs: readonly string[];
    readonly author: string;
    readonly at: string;
    /** The original subject, verbatim. */
    readonly subject: string;
    readonly kind: CommitKind;
    /** Recognized presentation: the subject without its prefix and agent visual. */
    readonly summary: string;
    /** The agent's static visual of recognized agent work. */
    readonly visual?: string;
};

/**
 * One rendered row of the history graph: the topology prefix and, on commit rows, the commit.
 *
 * @private Git history
 */
export type HistoryRow = { readonly graph: string; readonly commit?: HistoryCommit };

/**
 * A bounded window of the current branch's history (newest first), honest about shallow or missing history.
 *
 * @private Git history
 */
export type HistoryView = {
    readonly branch?: string;
    /** HEAD is detached (no current branch; `branch` is absent). */
    readonly detached?: boolean;
    /**
     * The current branch's configured upstream when the branch scope was requested: shown in the graph, configured
     * but absent from local refs (`missing`), not configured (`none`) or not applicable to a detached HEAD.
     */
    readonly upstream?: { readonly name?: string; readonly state: 'shown' | 'missing' | 'none' | 'detached' };
    /** Other locally known branches added to the graph (only names that exist locally). */
    readonly included?: readonly string[];
    /** Locally known branches that can be added to the graph (local heads and remote-tracking refs). */
    readonly available?: readonly string[];
    readonly rows: readonly HistoryRow[];
    /** More commits exist beyond this window. */
    readonly more: boolean;
    /** The repository is shallow: older history is not available locally. */
    readonly shallow: boolean;
    /** Why no history can be shown (no repository, no commit yet). */
    readonly problem?: string;
};

/**
 * Full detail of one commit: the original message and the verified provenance links of its trailers.
 *
 * @private Git history
 */
export type HistoryDetail = HistoryCommit & {
    readonly email: string;
    /** The complete original message (subject and body), verbatim. */
    readonly message: string;
    /** `Task-Name`/`Chat-Name` trailers (provenance by declared name; verified by the caller). */
    readonly trailers: { readonly tasks: readonly string[]; readonly chats: readonly string[] };
};

/**
 * Field and record separators of the formatted log.
 */
const FIELD = '\u001f';
const RECORD = '\u001e';

/**
 * Recognizes the Promptbook formats of a subject defensively; anything else stays a foreign commit shown verbatim.
 *
 * @private Git history
 */
export function classifySubject(subject: string): { readonly kind: CommitKind; readonly summary: string; readonly visual?: string } {
    const agent = /^ptbk: `([^`]+)` (.+)$/.exec(subject);
    if (agent) return { kind: 'agent', summary: agent[2]!, visual: agent[1]! };
    if (subject.startsWith('ptbk: ')) return { kind: 'system', summary: subject.slice('ptbk: '.length) };
    if (subject.startsWith('PTBK: ')) return { kind: 'legacy', summary: subject.slice('PTBK: '.length) };
    return { kind: 'foreign', summary: subject };
}

/**
 * Parses the commit fields of one formatted log record.
 */
function commitOf(fields: readonly string[]): HistoryCommit {
    const [sha = '', parents = '', refs = '', author = '', at = '', subject = ''] = fields;
    return {
        sha,
        parents: parents.split(' ').filter(Boolean),
        refs: refs
            .split(',')
            .map((ref) => ref.trim())
            .filter(Boolean),
        author,
        at,
        subject,
        ...classifySubject(subject),
    };
}

/**
 * Reads a window of the current branch's history with its real topology (`git log --graph` lanes), read-only: it never
 * fetches, switches branches or writes Git state.
 *
 * @private Git history
 */
export async function readHistory(repositoryRoot: string, options: HistoryOptions = {}): Promise<HistoryView> {
    const limit = Math.min(Math.max(1, options.limit ?? 200), 2000);
    const head = await git(repositoryRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
    if (head.exitCode !== 0) return { rows: [], more: false, shallow: false, problem: /unknown revision|ambiguous argument 'HEAD'/.test(head.stderr) ? 'No commit exists yet.' : 'This project has no readable Git history.' };
    const detached = head.stdout.trim() === 'HEAD';
    const branch = detached ? undefined : head.stdout.trim();
    const shallow = (await git(repositoryRoot, ['rev-parse', '--is-shallow-repository'])).stdout.trim() === 'true';
    const scope = options.upstream || options.branches?.length ? await branchScope(repositoryRoot, branch, options) : undefined;
    const format = `${FIELD}%H${FIELD}%P${FIELD}%D${FIELD}%an${FIELD}%aI${FIELD}%s`;
    // Only locally known full ref names reach `git log` (never a client-supplied revision or option).
    const revisions = ['HEAD', ...(scope?.revisions ?? [])];
    const log = await git(repositoryRoot, ['log', '--graph', '--topo-order', '--decorate=short', `--format=${format}`, `--skip=${Math.max(0, options.skip ?? 0)}`, `--max-count=${limit + 1}`, ...revisions, '--']);
    const base = { ...(branch ? { branch } : {}), ...(detached ? { detached } : {}), ...(scope ? { upstream: scope.upstream, included: scope.included, available: scope.available } : {}) };
    if (log.exitCode !== 0) return { ...base, rows: [], more: false, shallow, problem: log.stderr.trim() || 'The history could not be read.' };
    const rows: HistoryRow[] = [];
    let commits = 0;
    let more = false;
    for (const line of log.stdout.split('\n')) {
        if (!line) continue;
        const index = line.indexOf(FIELD);
        if (index < 0) {
            if (commits < limit) rows.push({ graph: line.trimEnd() });
            continue;
        }
        if (++commits > limit) {
            more = true;
            break;
        }
        rows.push({ graph: line.slice(0, index).trimEnd(), commit: commitOf(line.slice(index + 1).split(FIELD)) });
    }
    // Connector lines after the last shown commit belong to commits outside the window.
    while (rows.length && !rows[rows.length - 1]!.commit) rows.pop();
    return { ...base, rows, more, shallow };
}

/**
 * What a History window shows: the current branch alone (terminal default), or with the desktop branch scope.
 *
 * @private Git history
 */
export type HistoryOptions = {
    readonly limit?: number;
    readonly skip?: number;
    /** Adds the current branch's configured upstream (from locally available refs; never fetched). */
    readonly upstream?: boolean;
    /** Other locally known branches to add to the graph (short names as listed in `available`). */
    readonly branches?: readonly string[];
};

/**
 * Resolves the desktop branch scope against locally known refs: the configured upstream (or why it is not shown),
 * requested branches that exist locally, and the other branches available to add. Read-only.
 */
async function branchScope(repositoryRoot: string, branch: string | undefined, options: HistoryOptions): Promise<{ readonly revisions: readonly string[]; readonly upstream: NonNullable<HistoryView['upstream']>; readonly included: readonly string[]; readonly available: readonly string[] }> {
    const refs = await git(repositoryRoot, ['for-each-ref', `--format=%(refname)${FIELD}%(refname:short)${FIELD}%(upstream:short)${FIELD}%(upstream:track)`, 'refs/heads', 'refs/remotes']);
    const known = new Map<string, string>();
    let upstream: NonNullable<HistoryView['upstream']> = branch ? { state: 'none' } : { state: 'detached' };
    for (const line of refs.stdout.split('\n')) {
        const [full = '', short = '', upstreamName = '', track = ''] = line.split(FIELD);
        // A remote's symbolic default (`origin/HEAD`) is not a branch of its own.
        if (!full || full.endsWith('/HEAD')) continue;
        known.set(short, full);
        if (branch && full === `refs/heads/${branch}` && upstreamName) upstream = { name: upstreamName, state: track.includes('gone') ? 'missing' : 'shown' };
    }
    if (upstream.state === 'shown' && !known.has(upstream.name!)) upstream = { ...upstream, state: 'missing' };
    const revisions: string[] = [];
    if (options.upstream && upstream.state === 'shown') revisions.push(known.get(upstream.name!)!);
    const included = [...new Set(options.branches ?? [])].filter((name) => known.has(name) && name !== branch && name !== upstream.name);
    for (const name of included) revisions.push(known.get(name)!);
    const available = [...known.keys()].filter((name) => name !== branch && name !== upstream.name).sort((a, b) => a.localeCompare(b));
    return { revisions, upstream: options.upstream ? upstream : { ...upstream, state: upstream.state === 'shown' ? 'none' : upstream.state }, included, available };
}

/**
 * How one side of a current change alters its path.
 *
 * @private Git history
 */
export type ChangeKind = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'type-changed';

/**
 * One path of the live working tree/index that differs from HEAD: its staged (index) and unstaged (working tree)
 * change, untracked or conflicted state, and an origin only where the engine verified it. It has no commit SHA.
 *
 * @private Git history
 */
export type CurrentChange = {
    /** Project-relative POSIX path. */
    readonly path: string;
    /** The previous path of a staged rename or copy. */
    readonly from?: string;
    readonly staged?: ChangeKind;
    readonly unstaged?: ChangeKind;
    readonly untracked?: boolean;
    readonly conflicted?: boolean;
    /** Verified origin of the change (pending desktop or engine commit, task-owned); absent when unknown. */
    readonly origin?: { readonly kind: 'pending-desktop' | 'pending-engine' | 'task'; readonly label: string };
};

/**
 * The current changes section of desktop History (read-only; no staging, discarding or checkout).
 *
 * @private Git history
 */
export type CurrentChangesView = {
    readonly changes: readonly CurrentChange[];
    /** Changed protected paths (repository, runtime state, secrets) are only counted, never named. */
    readonly protected: number;
    /** More changes exist beyond this bound. */
    readonly truncated: boolean;
    readonly problem?: string;
};

/**
 * Most current changes listed.
 */
const MAX_CHANGES = 2000;

/**
 * Path segments whose changes are only counted (repository metadata, runtime state, secrets).
 */
const PROTECTED_SEGMENT = /^\.(git|ptbk|env)(\b|$)|^\.(ssh|gnupg|npmrc|netrc)$/i;

/**
 * Change kind of one porcelain status letter.
 */
function changeKind(letter: string): ChangeKind | undefined {
    return ({ A: 'added', M: 'modified', D: 'deleted', R: 'renamed', C: 'copied', T: 'type-changed' } as Record<string, ChangeKind>)[letter];
}

/**
 * Reads the current changes of the project's part of the working tree and index (`git status`, read-only: Git's own
 * index refresh aside, nothing is written). `origin` annotates paths whose source the caller can verify.
 *
 * @private Git history
 */
export async function readCurrentChanges(projectRoot: string, origin: (absolutePath: string) => CurrentChange['origin'] = () => undefined): Promise<CurrentChangesView> {
    // Git's own view of where the project sits in the repository (robust to symlinked paths such as /tmp).
    const prefix = await git(projectRoot, ['rev-parse', '--show-prefix']);
    if (prefix.exitCode !== 0) return { changes: [], protected: 0, truncated: false, problem: 'This project is not in a Git working tree.' };
    const projectPrefix = prefix.stdout.trim();
    // `--no-optional-locks`: browsing never takes the index lock away from a concurrent commit.
    const status = await git(projectRoot, ['--no-optional-locks', 'status', '--porcelain=v2', '-z', '--untracked-files=all', '--', '.']);
    if (status.exitCode !== 0) return { changes: [], protected: 0, truncated: false, problem: status.stderr.trim() || 'The working tree status could not be read.' };
    const changes: CurrentChange[] = [];
    let protectedCount = 0;
    const fields = status.stdout.split('\0');
    const add = (repositoryPath: string, change: Omit<CurrentChange, 'path'>): void => {
        if (!repositoryPath.startsWith(projectPrefix)) return;
        const path = repositoryPath.slice(projectPrefix.length);
        if (!path || path.split('/').some((segment) => PROTECTED_SEGMENT.test(segment))) {
            protectedCount++;
            return;
        }
        const verified = origin(resolve(projectRoot, ...path.split('/')));
        const from = change.from?.startsWith(projectPrefix) ? change.from.slice(projectPrefix.length) : change.from;
        changes.push({ path, ...change, ...(from ? { from } : {}), ...(verified ? { origin: verified } : {}) });
    };
    for (let index = 0; index < fields.length; index++) {
        const field = fields[index]!;
        if (!field) continue;
        if (field.startsWith('? ')) add(field.slice(2), { untracked: true });
        else if (field.startsWith('u ')) add(field.split(' ').slice(10).join(' '), { conflicted: true });
        else if (field.startsWith('1 ') || field.startsWith('2 ')) {
            const parts = field.split(' ');
            const xy = parts[1] ?? '..';
            const path = parts.slice(field.startsWith('2 ') ? 9 : 8).join(' ');
            const from = field.startsWith('2 ') ? fields[++index] : undefined;
            const staged = changeKind(xy[0]!);
            const unstaged = changeKind(xy[1]!);
            add(path, { ...(staged ? { staged } : {}), ...(unstaged ? { unstaged } : {}), ...(from ? { from } : {}) });
        }
    }
    changes.sort((a, b) => Number(Boolean(b.conflicted)) - Number(Boolean(a.conflicted)) || a.path.localeCompare(b.path));
    return { changes: changes.slice(0, MAX_CHANGES), protected: protectedCount, truncated: changes.length > MAX_CHANGES };
}

/**
 * Reads one commit's complete original message, identity and provenance trailers (read-only).
 *
 * @private Git history
 */
export async function readCommit(repositoryRoot: string, sha: string): Promise<HistoryDetail> {
    if (!/^[0-9a-f]{7,64}$/i.test(sha)) throw new PtbkError(`${sha} is not a commit id.`, { kind: 'usage' });
    const result = await git(repositoryRoot, ['show', '-s', `--format=%H${FIELD}%P${FIELD}%D${FIELD}%an${FIELD}%aI${FIELD}%s${FIELD}%ae${FIELD}%B${RECORD}`, sha]);
    if (result.exitCode !== 0) throw new PtbkError(`The commit ${sha} is not available locally.`, { kind: 'not-found', reason: result.stderr.trim() });
    const fields = result.stdout.split(RECORD)[0]!.split(FIELD);
    const message = (fields[7] ?? '').replace(/\n+$/, '');
    const trailer = (name: string): string[] => [...message.matchAll(new RegExp(`^${name}: (.+)$`, 'gm'))].map((match) => match[1]!.trim());
    return { ...commitOf(fields), email: fields[6] ?? '', message, trailers: { tasks: trailer('Task-Name'), chats: trailer('Chat-Name') } };
}
