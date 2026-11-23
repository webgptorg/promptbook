import { setTimeout as delay } from 'node:timers/promises';

/** A transient GitHub failure gets at most two additional creation attempts. */
const MAX_CREATE_ATTEMPTS = 3;

/** Reads the exact release and its assets; only an explicit missing release permits creation. */
async function readRelease(gh, tag) {
    let output;
    try {
        output = await gh(['release', 'view', tag, '--json', 'tagName,assets']);
    } catch (error) {
        if (/^\s*release not found\s*$/i.test(error.stderr ?? error.message)) return undefined;
        throw error;
    }
    const release = JSON.parse(output);
    if (release.tagName !== tag || !Array.isArray(release.assets)) throw new Error(`GitHub returned invalid release metadata for ${tag}.`);
    return release;
}

/**
 * Ensures the asset publishers share the same tagged GitHub Release, without overwriting an existing release.
 * GitHub returned HTTP 500 during release creation for 0.119.0-36 after npm had already published successfully.
 * Reconcile every failed creation, including a lost response or a concurrent publisher, before retrying a 5xx.
 * A failed lookup leaves the outcome uncertain and stops publication; credentials and validation errors are not retried.
 */
export async function ensureGithubRelease(tag, notes, { gh, sleep = delay, log = (message) => process.stdout.write(`${message}\n`) }) {
    let release = await readRelease(gh, tag);
    if (release) return release;
    for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt++) {
        try {
            await gh(['release', 'create', tag, '--verify-tag', '--title', `ptbk ${tag.slice(1)}`, '--notes', notes, ...(tag.includes('-') ? ['--prerelease'] : [])]);
        } catch (creationError) {
            release = await readRelease(gh, tag);
            if (release) return release;
            if (attempt === MAX_CREATE_ATTEMPTS || !/\bHTTP 5\d\d\b/.test(creationError.stderr ?? creationError.message)) throw creationError;
            log(`GitHub temporarily failed to create ${tag}; the release is still absent. Retrying (${attempt + 1}/${MAX_CREATE_ATTEMPTS}).`);
            await sleep(attempt * 5000);
            // Another publisher may have created the release during the backoff.
            release = await readRelease(gh, tag);
            if (release) return release;
            continue;
        }
        release = await readRelease(gh, tag);
        if (!release) throw new Error(`GitHub accepted creation of ${tag}, but the release could not be read. Retry verification before publishing again.`);
        return release;
    }
}
