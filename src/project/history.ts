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
export async function readHistory(repositoryRoot: string, options: { readonly limit?: number; readonly skip?: number } = {}): Promise<HistoryView> {
    const limit = Math.min(Math.max(1, options.limit ?? 200), 2000);
    const head = await git(repositoryRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
    if (head.exitCode !== 0) return { rows: [], more: false, shallow: false, problem: /unknown revision|ambiguous argument 'HEAD'/.test(head.stderr) ? 'No commit exists yet.' : 'This project has no readable Git history.' };
    const shallow = (await git(repositoryRoot, ['rev-parse', '--is-shallow-repository'])).stdout.trim() === 'true';
    const format = `${FIELD}%H${FIELD}%P${FIELD}%D${FIELD}%an${FIELD}%aI${FIELD}%s`;
    const log = await git(repositoryRoot, ['log', '--graph', '--topo-order', '--decorate=short', `--format=${format}`, `--skip=${Math.max(0, options.skip ?? 0)}`, `--max-count=${limit + 1}`, 'HEAD']);
    if (log.exitCode !== 0) return { branch: head.stdout.trim(), rows: [], more: false, shallow, problem: log.stderr.trim() || 'The history could not be read.' };
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
    return { branch: head.stdout.trim(), rows, more, shallow };
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
