import { readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promptbookAppData } from '../common/app-data.js';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, readJsonIfExists } from '../common/fs.js';
import { shortHash } from '../common/ids.js';
import { isProcessAlive } from '../common/process.js';

/**
 * One user-controlled tab of a shared browser profile: while it exists, no engine connected to that profile lets
 * automation act on, inspect or record the tab.
 *
 * @private browser tab control
 */
export type TabReservation = {
    readonly version: 1;
    readonly targetId: string;
    /** Identity of this reservation; a duplicate or stale handoff of an earlier one cannot release it. */
    readonly generation: string;
    /** The engine holding it (its process; a dead holder's reservation is stale). */
    readonly instanceId: string;
    readonly pid: number;
    readonly project: string;
    readonly since: string;
    readonly purpose: 'wallet' | 'browse';
};

/**
 * A raw DevTools endpoint an agent task received: automation through it cannot be held back by the tab boundary, so
 * starting protected control states the limitation.
 *
 * @private browser tab control
 */
export type RawEndpointGrant = { readonly version: 1; readonly holder: string; readonly pid: number; readonly project: string; readonly since: string };

/**
 * The shared browser-control boundary of every engine using one actual profile: user-controlled tabs and raw
 * DevTools endpoint grants under `<app data>/browser-pools/tabs/<profile hash>/`. A reservation is created exclusively
 * (an atomic create), so two engines can never both hand one tab to a user, and it is released only with its own
 * generation.
 *
 * @private browser tab control
 */
export class TabReservations {
    public constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

    /** Directory of one profile's reservations. */
    private directory(profile: string): string {
        return join(promptbookAppData(this.env), 'browser-pools', 'tabs', shortHash(profile, 16));
    }

    /** File of one tab's reservation. */
    private file(profile: string, targetId: string): string {
        return join(this.directory(profile), `tab-${targetId.replace(/[^A-Za-z0-9_-]/g, '_')}.json`);
    }

    /** Reserves a tab for a user (refused while a live reservation of it exists). */
    public async reserve(profile: string, entry: Omit<TabReservation, 'version' | 'pid' | 'since'>): Promise<TabReservation> {
        await ensureDirectory(this.directory(profile));
        const reservation: TabReservation = { version: 1, ...entry, pid: process.pid, since: new Date().toISOString() };
        const file = this.file(profile, entry.targetId);
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                await writeFile(file, JSON.stringify(reservation), { flag: 'wx' });
                return reservation;
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
                const existing = await readJsonIfExists<TabReservation>(file).catch(() => undefined);
                if (existing && isProcessAlive(existing.pid)) throw new PtbkError('This tab is already controlled by a user.', { kind: 'conflict', reason: `Reserved since ${existing.since} for ${existing.project}.` });
                // A stale reservation of an engine that ended without releasing it.
                await rm(file, { force: true });
            }
        }
        throw new PtbkError('The tab could not be reserved; try again.', { kind: 'technical' });
    }

    /** Releases a reservation only with its own generation (a stale handoff releases nothing). */
    public async release(profile: string, targetId: string, generation: string): Promise<boolean> {
        const file = this.file(profile, targetId);
        const existing = await readJsonIfExists<TabReservation>(file).catch(() => undefined);
        if (!existing || existing.generation !== generation) return false;
        await rm(file, { force: true });
        return true;
    }

    /** Live reservations of a profile (stale ones are dropped). */
    public async list(profile: string): Promise<TabReservation[]> {
        const directory = this.directory(profile);
        const names = await readdir(directory).catch(() => [] as string[]);
        const live: TabReservation[] = [];
        for (const name of names.filter((candidate) => candidate.startsWith('tab-') && candidate.endsWith('.json'))) {
            const entry = await readJsonIfExists<TabReservation>(join(directory, name)).catch(() => undefined);
            if (!entry) continue;
            if (isProcessAlive(entry.pid)) live.push(entry);
            else await rm(join(directory, name), { force: true }).catch(() => undefined);
        }
        return live;
    }

    /** Records that an agent task received the raw DevTools endpoint of this profile's browser. */
    public async grantRawEndpoint(profile: string, holder: string, project: string): Promise<void> {
        await ensureDirectory(this.directory(profile));
        const grant: RawEndpointGrant = { version: 1, holder, pid: process.pid, project, since: new Date().toISOString() };
        await writeFile(join(this.directory(profile), `raw-${shortHash(holder, 12)}.json`), JSON.stringify(grant));
    }

    /** The task's grant ended (its browser use ended). */
    public async revokeRawEndpoint(profile: string, holder: string): Promise<void> {
        await rm(join(this.directory(profile), `raw-${shortHash(holder, 12)}.json`), { force: true }).catch(() => undefined);
    }

    /** Live raw endpoint grants of a profile. */
    public async rawEndpoints(profile: string): Promise<RawEndpointGrant[]> {
        const directory = this.directory(profile);
        const names = await readdir(directory).catch(() => [] as string[]);
        const live: RawEndpointGrant[] = [];
        for (const name of names.filter((candidate) => candidate.startsWith('raw-') && candidate.endsWith('.json'))) {
            const entry = await readJsonIfExists<RawEndpointGrant>(join(directory, name)).catch(() => undefined);
            if (entry && isProcessAlive(entry.pid)) live.push(entry);
            else await rm(join(directory, name), { force: true }).catch(() => undefined);
        }
        return live;
    }
}
