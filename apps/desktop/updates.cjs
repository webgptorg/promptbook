'use strict';

/** Public release feed; renderer input never selects a host or a download URL. */
const RELEASES = 'https://api.github.com/repos/webgptorg/promptbook/releases';
/** Successful checks run every six hours; unknown results retry after one hour. */
const INTERVAL = 6 * 60 * 60 * 1000;
/** Bounded feed size and total request time keep discovery from blocking the app. */
const MAX_PAGES = 5;

/** Returns only a finished installer matching this exact version, OS and architecture. */
function installer(release, version, platform, arch) {
    const names = platform === 'win32' && arch === 'x64'
        ? [`Promptbook-Setup-${version}-windows-x64.exe`]
        : platform === 'darwin' && ['arm64', 'x64'].includes(arch)
          ? [`Promptbook-${version}-macos-${arch}.dmg`, `Promptbook-${version}-macos-${arch}-unsigned.dmg`]
          : [];
    for (const name of names) {
        const asset = (release.assets || []).find((item) => item.name === name && item.state === 'uploaded' && item.size > 0);
        if (asset && (!name.endsWith('-unsigned.dmg') || version.split('+')[0].includes('-'))) return { name, unsigned: name.endsWith('-unsigned.dmg'), url: `https://github.com/webgptorg/promptbook/releases/download/${encodeURIComponent(release.tag_name)}/${encodeURIComponent(name)}` };
    }
    return undefined;
}

/**
 * Client-only release discovery. It never installs code, restarts the app or changes engine policy.
 * The selector is bundled from the engine source at build time (injected only by tests).
 */
class DesktopUpdates {
    constructor({ current, platform, arch, changed = () => {}, fetch = (...args) => globalThis.fetch(...args), selectUpdate, packaged = true }) {
        this.current = current;
        this.platform = platform;
        this.arch = arch;
        this.changed = changed;
        this.fetch = fetch;
        this.select = selectUpdate || require('./update-policy.cjs').selectUpdate;
        this.packaged = packaged;
        this.state = { current, channel: /-/.test(current.split('+')[0]) ? 'prerelease' : 'stable', status: 'idle' };
    }

    /** A complete result is broadcast to every window; opening another window does not issue another lookup. */
    publish(state) {
        this.state = { ...this.state, ...state };
        this.changed(this.state);
        return this.state;
    }

    /** Coalesces concurrent manual/background checks, with one deadline across all feed pages. */
    check() {
        if (this.pending) return this.pending;
        this.pending = this.lookup().finally(() => { this.pending = undefined; });
        return this.pending;
    }

    /** Reads complete GitHub releases; missing installers, drafts and invalid version tags cannot be offered. */
    async lookup() {
        this.publish({ status: 'checking', problem: undefined });
        const signal = AbortSignal.timeout(15_000);
        try {
            const candidates = new Map();
            for (let page = 1; page <= MAX_PAGES; page++) {
                const response = await this.fetch(`${RELEASES}?per_page=100&page=${page}`, {
                    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, signal,
                });
                if (!response.ok) throw new Error(`GitHub release information is unavailable (HTTP ${response.status}).`);
                const releases = await response.json();
                if (!Array.isArray(releases)) throw new Error('The release feed was not readable.');
                for (const release of releases) {
                    if (!release || release.draft || typeof release.tag_name !== 'string') continue;
                    const version = release.tag_name.replace(/^v/, '');
                    // GitHub's prerelease flag cannot turn a stable version into a stable offer by accident.
                    if (release.prerelease && !version.split('+')[0].includes('-')) continue;
                    if (!this.select(this.current, [version], { isAutoUpdateEnabled: true }).target) continue;
                    const asset = installer(release, version, this.platform, this.arch);
                    if (asset) candidates.set(version, { version, ...asset, releaseUrl: `https://github.com/webgptorg/promptbook/releases/tag/${encodeURIComponent(release.tag_name)}` });
                }
                if (releases.length < 100) break;
                if (page === MAX_PAGES) throw new Error('The release history exceeds this bounded check; availability is unknown.');
            }
            const target = this.select(this.current, [...candidates.keys()], { isAutoUpdateEnabled: true }).target;
            return this.publish({ status: target ? 'available' : 'current', available: target ? candidates.get(target) : undefined, checkedAt: new Date().toISOString(), problem: undefined });
        } catch (error) {
            // Retain the previous useful link, but never label an offline/rate-limited result as up to date.
            return this.publish({ status: 'unknown', checkedAt: new Date().toISOString(), problem: error.message || 'Release information is unavailable.' });
        }
    }

    /** Starts once after launch and continues while the tray is alive, including with zero project windows. */
    start() {
        if (!this.packaged || this.timer) return;
        const next = async () => {
            await this.check();
            if (!this.stopped) this.timer = setTimeout(next, this.state.status === 'unknown' ? INTERVAL / 6 : INTERVAL).unref();
        };
        this.timer = setTimeout(next, 60_000).unref();
    }

    /** Quitting cancels future discovery; it never affects an engine. */
    stop() { this.stopped = true; clearTimeout(this.timer); }
}

module.exports = { DesktopUpdates };
