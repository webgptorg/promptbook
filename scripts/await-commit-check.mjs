import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

/** The workflow whose push run of the release commit can stand in for the publication's own validation. */
const CHECK_WORKFLOW = 'check.yml';

/** Run conclusions that get one re-run of their failed jobs; with GitHub, a re-run covers cancelled jobs as well. */
const FAILED_CONCLUSIONS = new Set(['failure', 'cancelled', 'timed_out']);

/**
 * Waits for the `check.yml` run of a pushed commit and reports whether it passed.
 *
 * A release commit is pushed together with its tag, so the branch push already runs the whole check on the exact
 * commit the tag names. Running it a second time for the publication doubled the runners each release needed (and
 * the macOS queue) for an identical result.
 *
 * A failed run has its failed jobs re-run once (`rerunFailedJobs`), which costs only those jobs. Failing again, only the
 * engine jobs (`check (...)`, see `isEngineJob`) decide the npm package: when they all passed and only desktop jobs
 * failed (the private App source, a missing macOS runner), the engine is still released (`passed`) and only the desktop
 * installers are not (`desktop: false`). Failing engine jobs fail the publication (`failed`), because validating the
 * same commit once more would only repeat the failure half an hour later.
 *
 * A cancelled or timed-out run counts as failed: `check.yml` has no concurrency group, so only a job reaching its
 * timeout cancels it (a Windows shard that hung on 0.119.0-125/126). Validating the whole tag again instead took
 * another 60 minutes for 0.119.0-126 and hung the same way; re-running only the cancelled job is the cheaper retry.
 * A run that does not appear within `appearanceTimeoutMs` or does not finish in time is not reused: the publication
 * then validates the tag itself.
 *
 * @returns `{ passed, desktop, failed, runId }`: `passed` means the engine is validated, `desktop` that the run's desktop
 * jobs passed too, and `runId` is the reused run (its artifacts, like the Windows installer candidate, belong to the
 * validated commit) or `undefined`
 */
export async function awaitCommitCheck({ listRuns, listJobs = async () => [], rerunFailedJobs, sleep = delay, now = Date.now, log = () => {}, appearanceTimeoutMs = 3 * 60_000, completionTimeoutMs = 90 * 60_000, pollMs = 15_000 }) {
    const start = now();
    const unusable = { passed: false, desktop: false, failed: false, runId: undefined };
    let replaced;
    let run;
    for (;;) {
        const runs = await listRuns();
        run = runs.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
        // Right after the re-run request, the listing may still show the finished attempt it replaces.
        const isReplacedAttempt = replaced !== undefined && run?.id === replaced.id && run.run_attempt <= replaced.attempt;
        if (run?.status === 'completed' && !isReplacedAttempt) {
            if (!FAILED_CONCLUSIONS.has(run.conclusion) || replaced !== undefined) break;
            log(`Check run ${run.html_url} failed: re-running its failed jobs once.`);
            await rerunFailedJobs(run.id);
            replaced = { id: run.id, attempt: run.run_attempt };
        }
        const elapsed = now() - start;
        if (!run && elapsed >= appearanceTimeoutMs) {
            log('No check run of this commit appeared: the publication validates the tag itself.');
            return unusable;
        }
        if (run && elapsed >= completionTimeoutMs) {
            log(`Check run ${run.html_url} did not finish in time: the publication validates the tag itself.`);
            return unusable;
        }
        if (run) log(`Waiting for check run ${run.html_url} (${run.status})...`);
        await sleep(pollMs);
    }
    if (FAILED_CONCLUSIONS.has(run.conclusion)) {
        const engine = (await listJobs(run.id)).filter((job) => isEngineJob(job.name));
        if (engine.length > 0 && engine.every((job) => job.conclusion === 'success')) {
            log(`Check run ${run.html_url} failed again, but only in desktop jobs: the engine is released, the desktop installers are not.`);
            return { passed: true, desktop: false, failed: false, runId: String(run.id) };
        }
        log(`Check run ${run.html_url} failed again: this commit cannot be released.`);
        return { passed: false, desktop: false, failed: true, runId: undefined };
    }
    if (run.conclusion !== 'success') {
        log(`Check run ${run.html_url} ended with ${run.conclusion}: the publication validates the tag itself.`);
        return unusable;
    }
    log(`Check run ${run.html_url} passed for this exact commit: it is reused as the publication's validation.`);
    return { passed: true, desktop: true, failed: false, runId: String(run.id) };
}

/**
 * Whether a `check.yml` job validates the npm engine itself (the type checks, test shards and package checks of the
 * `check` matrix) rather than a desktop installer built around it.
 */
export function isEngineJob(name) {
    return /^check \(/.test(name);
}

/** HTTP statuses of the GitHub API that are worth asking again: server errors and rate limiting. */
const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Calls the GitHub REST API of `repository` and returns the parsed JSON body (`undefined` without one).
 *
 * A read (GET) that meets a transient server error or a network failure is asked again with a growing pause: a single
 * `HTTP 500` while polling the branch check run failed the whole release of 0.119.0-137. Writes are never repeated.
 */
export async function githubApi({ repository, token, fetch: fetchFunction = fetch, sleep = delay, attempts = 6, retryMs = 10_000 }, path, method = 'GET') {
    for (let attempt = 1; ; attempt++) {
        let response;
        let failure;
        try {
            response = await fetchFunction(`https://api.github.com/repos/${repository}/${path}`, { method, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' } });
        } catch (error) {
            failure = new Error(`GitHub API ${method} ${path} failed: ${error.message}`); // Network failure.
        }
        if (response?.ok) {
            const body = await response.text();
            return body ? JSON.parse(body) : undefined;
        }
        if (response) {
            failure = new Error(`GitHub API ${method} ${path} failed: HTTP ${response.status} ${await response.text()}`);
            if (!TRANSIENT_STATUSES.has(response.status)) throw failure;
        }
        if (method !== 'GET' || attempt >= attempts) throw failure;
        console.log(`::warning::${failure.message.split('\n')[0]} (attempt ${attempt} of ${attempts}); asking again.`);
        await sleep(retryMs * attempt);
    }
}

// Command line (GitHub Actions): `node scripts/await-commit-check.mjs <commit sha>` with GH_TOKEN and GH_REPO; writes
// `passed`, `desktop` and `run-id` to GITHUB_OUTPUT.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
    const sha = process.argv[2];
    if (!/^[0-9a-f]{40}$/.test(sha ?? '')) throw new Error('Pass the full commit SHA to await.');
    const { GH_TOKEN: token, GH_REPO: repository, GITHUB_OUTPUT: output } = process.env;
    if (!token || !repository) throw new Error('GH_TOKEN and GH_REPO are required.');
    const api = { repository, token };
    const { passed, desktop, failed, runId } = await awaitCommitCheck({
        listRuns: async () => (await githubApi(api, `actions/workflows/${CHECK_WORKFLOW}/runs?event=push&head_sha=${sha}&per_page=20`)).workflow_runs,
        // Jobs of the latest attempt only: a re-run job is listed again with its new result.
        listJobs: async (id) => (await githubApi(api, `actions/runs/${id}/jobs?filter=latest&per_page=100`)).jobs,
        rerunFailedJobs: (id) => githubApi(api, `actions/runs/${id}/rerun-failed-jobs`, 'POST'),
        log: (message) => console.log(message),
    });
    if (output) await appendFile(output, `passed=${passed}\ndesktop=${desktop}\nrun-id=${runId ?? ''}\n`);
    // A commit whose check fails twice is not released; the publication does not validate it again.
    if (failed) process.exitCode = 1;
}
