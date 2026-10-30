/**
 * Map engine M.m.p[-n] to (M+2).m.(p*100000+n), with n=99999 for stable releases.
 * Marketplace accepts only numeric triplets; the old publisher already released 1.x.
 * Reserve each patch's highest slot for stable so every normal engine version bump remains an editor update.
 */
export function vscodeVersion(version) {
    const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(0|[1-9]\d*))?$/.exec(version);
    if (!match) throw new Error(`Unsupported engine version for Marketplace: ${version}. Expected M.m.p or M.m.p-n.`);
    const [, major, minor, patch, pre] = match;
    const counter = pre === undefined ? 99999 : Number(pre);
    if (counter > 99999 || (pre !== undefined && counter === 99999)) throw new Error('Marketplace prerelease counter must be 0..99998.');
    const fields = [Number(major) + 2, Number(minor), Number(patch) * 100000 + counter];
    if (fields.some((field) => !Number.isSafeInteger(field) || field > 2147483647)) throw new Error('Marketplace version fields must fit signed 32-bit integers.');
    return fields.join('.');
}
