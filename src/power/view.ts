/**
 * Saved keep-awake choice of one project on this host.
 *
 * - `off`: the default; the engine holds no request.
 * - `limited`: a two-hour session on external power whose end is saved as an absolute time.
 * - `always`: explicit opt-in for unattended operation whenever the engine runs on external power.
 *
 * @private keep-awake
 */
export type KeepAwakeMode = 'off' | 'limited' | 'always';

/**
 * Power source of the engine host as the operating system reports it.
 *
 * @private keep-awake
 */
export type PowerSource = 'external' | 'battery' | 'unknown';

/**
 * Why a protection is or is not in effect. `code` is stable for clients; `text` is the explanation shown to people.
 *
 * @private keep-awake
 */
export type KeepAwakeReason = {
    readonly code:
        | 'active'
        | 'off'
        | 'not-chosen'
        | 'starting'
        | 'paused'
        | 'pausing'
        | 'stopping'
        | 'stopped'
        | 'battery'
        | 'power-unknown'
        | 'approval'
        | 'unsupported'
        | 'failed'
        | 'os-policy'
        | 'changed-outside';
    readonly text: string;
};

/**
 * Observed state of one kind of protection (idle sleep or lid closure), separate from the saved choice.
 *
 * - `active`: this engine holds a verified request.
 * - `inactive`: eligible in principle, but not held now (see `reason`).
 * - `degraded`: held or wanted, but the operating system does not confirm the expected effect.
 * - `unavailable`: this host cannot provide it (see `reason`).
 * - `os-policy`: no request; the operating system's own policy applies (closed lid only).
 *
 * @private keep-awake
 */
export type KeepAwakeProtectionView = {
    readonly state: 'active' | 'inactive' | 'degraded' | 'unavailable' | 'os-policy';
    readonly reason: KeepAwakeReason;
    /** When the current request was acquired (ISO). */
    readonly since?: string;
};

/**
 * The engine's keep-awake preference and its observed protection on the engine host, identical for the terminal
 * dashboard, the local browser dashboard, the desktop app and `ptbk keep-awake`.
 *
 * @private keep-awake
 */
export type KeepAwakeView = {
    /** Saved choice (host-local private metadata, independent from this process and the OS request). */
    readonly mode: KeepAwakeMode;
    /** Absolute end of a limited session (ISO); a pause, battery interval or restart never extends it. */
    readonly expiresAt?: string;
    /** The operator opted in to closed-lid operation (only meaningful where the host offers it). */
    readonly closedLid: boolean;
    /** Power source of the engine host. */
    readonly power: { readonly source: PowerSource; readonly detail?: string; readonly observedAt?: string };
    /** Idle-sleep protection. */
    readonly idle: KeepAwakeProtectionView;
    /** Closed-lid protection, shown separately from idle sleep. */
    readonly lid: KeepAwakeProtectionView & {
        /** Whether the host offers a closed-lid mechanism (`approval`: it needs local administrator approval first). */
        readonly capability: 'available' | 'approval' | 'unavailable';
        /** Hardware validation of the mechanism on this model and OS version (only when a mechanism exists). */
        readonly validation?: { readonly validated: boolean; readonly text: string };
        /** What the OS reports right now: whether closing the lid would put the host to sleep. */
        readonly sleepsOnClose?: boolean;
    };
    /** This engine currently holds an OS request (idle sleep, closed lid or both). */
    readonly holding: boolean;
    /** Last task or chat work of the project on this host (ISO); absent when no activity is known. */
    readonly lastWorkAt?: string;
    /** The engine host the controls describe. */
    readonly host: { readonly platform: string; readonly model?: string; readonly os?: string };
    /** A bounded restart/update handoff that carries protection to the replacement engine. */
    readonly handoff?: { readonly until: string; readonly kinds: readonly string[] };
};
