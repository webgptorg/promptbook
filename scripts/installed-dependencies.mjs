import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Reads a JSON file, or undefined when it is missing or unreadable.
 */
async function readJson(path) {
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    } catch {
        return undefined;
    }
}

/**
 * Problems of the installed direct dependencies of a checkout, as readable lines (empty: they match).
 *
 * A pull or merge can change `package.json` and `package-lock.json` without a following `npm install`. The release
 * checks then fail much later with errors that look unrelated (for example a missing type library), so this names the
 * actual cause first: a lockfile that no longer matches `package.json`, or a direct dependency whose installed version
 * differs from the locked one. Optional dependencies may be absent on this platform.
 */
export async function installedDependencyProblems(root) {
    const manifest = await readJson(join(root, 'package.json'));
    const lock = await readJson(join(root, 'package-lock.json'));
    if (!manifest || !lock?.packages?.['']) return ['package-lock.json is missing or unreadable.'];
    const locked = lock.packages[''];
    const problems = [];
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
        const declared = manifest[field] ?? {};
        const recorded = locked[field] ?? {};
        for (const name of new Set([...Object.keys(declared), ...Object.keys(recorded)])) {
            if (declared[name] !== recorded[name]) problems.push(`package-lock.json records ${name} ${recorded[name] ?? '(absent)'} in ${field}, package.json declares ${declared[name] ?? '(absent)'}.`);
        }
    }
    const names = Object.keys({ ...locked.dependencies, ...locked.devDependencies, ...locked.optionalDependencies });
    for (const name of names) {
        const entry = lock.packages[`node_modules/${name}`];
        if (!entry || entry.optional) continue;
        const installed = (await readJson(join(root, 'node_modules', name, 'package.json')))?.version;
        if (installed !== entry.version) problems.push(`${name} ${entry.version} is locked, ${installed ? `${installed} is installed` : 'it is not installed'}.`);
    }
    return problems;
}
