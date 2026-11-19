import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

/** The workflow whose push run of the release commit can stand in for the publication's own validation. */
const CHECK_WORKFLOW = 'check.yml';

/**
 * Waits for the `check.yml` run of a pushed commit and reports whether it passed.
 *
 * A release commit is pushed together with its tag, so the branch push already runs the whole check on the exact
 * commit the tag names. Running it a second time for the publication doubled the runners each release needed (and
 * the macOS queue) for an identical result.
 *
 * A failed run has its failed jobs re-run once (`rerunFailedJobs`), which costs only those jobs; failing again, it
 * fails the publication (`failed`), because validating the same commit once more would only repeat the failure half
 * an hour later. A run that does not appear within `appearanceTimeoutMs`, is cancelled (for example by a newer push)
 * or does not finish in time is not reused: the publication then validates the tag itself.
 *
 * @returns `{ passed, failed, runId }`: `runId` is the reused run (its artifacts, like the Windows installer candidate,
 * belong to the validated commit) or `undefined`
 */
export async function awaitCommitCheck({ listRuns, rerunFailedJobs, sleep = delay, now = Date.now, log = () => {}, appearanceTimeoutMs = 3 * 60_000, completionTimeoutMs = 90 * 60_000, pollMs = 15_000 }) {
    const start = now();
    const unusable = { passed: false, failed: false, runId: undefined };
    let replaced;
    let run;
    for (;;) {
        const runs = await listRuns();
        run = runs.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
        // Right after the re-run request, the listing may still show the finished attempt it replaces.
        const isReplacedAttempt = replaced !== undefined && run?.id === replaced.id && run.run_attempt <= replaced.attempt;
        if (run?.status === 'completed' && !isReplacedAttempt) {
            if (run.conclusion !== 'failure' || replaced !== undefined) break;
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
    if (run.conclusion === 'failure') {
        log(`Check run ${run.html_url} failed again: this commit cannot be released.`);
        return { passed: false, failed: true, runId: undefined };
    }
    if (run.conclusion !== 'success') {
        log(`Check run ${run.html_url} ended with ${run.conclusion}: the publication validates the tag itself.`);
        return unusable;
    }
    log(`Check run ${run.html_url} passed for this exact commit: it is reused as the publication's validation.`);
    return { passed: true, failed: false, runId: String(run.id) };
}

/** Calls the GitHub REST API of `repository` and returns the parsed JSON body (`undefined` without one). */
async function githubApi({ repository, token }, path, method = 'GET') {
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, { method, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' } });
    if (!response.ok) throw new Error(`GitHub API ${method} ${path} failed: HTTP ${response.status} ${await response.text()}`);
    const body = await response.text();
    return body ? JSON.parse(body) : undefined;
}

// Command line (GitHub Actions): `node scripts/await-commit-check.mjs <commit sha>` with GH_TOKEN and GH_REPO; writes
// `passed` and `run-id` to GITHUB_OUTPUT.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
    const sha = process.argv[2];
    if (!/^[0-9a-f]{40}$/.test(sha ?? '')) throw new Error('Pass the full commit SHA to await.');
    const { GH_TOKEN: token, GH_REPO: repository, GITHUB_OUTPUT: output } = process.env;
    if (!token || !repository) throw new Error('GH_TOKEN and GH_REPO are required.');
    const api = { repository, token };
    const { passed, failed, runId } = await awaitCommitCheck({
        listRuns: async () => (await githubApi(api, `actions/workflows/${CHECK_WORKFLOW}/runs?event=push&head_sha=${sha}&per_page=20`)).workflow_runs,
        rerunFailedJobs: (id) => githubApi(api, `actions/runs/${id}/rerun-failed-jobs`, 'POST'),
        log: (message) => console.log(message),
    });
    if (output) await appendFile(output, `passed=${passed}\nrun-id=${runId ?? ''}\n`);
    // A commit whose check fails twice is not released; the publication does not validate it again.
    if (failed) process.exitCode = 1;
}
