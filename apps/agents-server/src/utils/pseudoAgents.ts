import {
    createPseudoAgentUrl,
    resolvePseudoAgentKindFromReference,
    type PseudoAgentKind,
    VOID_PSEUDO_AGENT_ALIAS_KEYS,
} from '../../../../src/book-2.0/agent-source/pseudoAgentReferences';

/**
 * Canonical lower-case names for pseudo agents.
 *
 * @private internal utility of pseudo-agent routing
 */
export const PSEUDO_AGENT_CANONICAL_NAMES: Readonly<Record<PseudoAgentKind, string>> = {
    USER: 'user',
    VOID: 'void',
};

/**
 * Rich descriptor used to render pseudo-agent profile pages.
 *
 * @private internal descriptor for pseudo-agent UI rendering
 */
export type PseudoAgentDescriptor = {
    /**
     * Unique pseudo-agent kind.
     */
    readonly kind: PseudoAgentKind;

    /**
     * Lower-case canonical route name.
     */
    readonly canonicalName: string;

    /**
     * Display title shown in the page hero.
     */
    readonly displayName: string;

    /**
     * Emoji symbol used in the hero.
     */
    readonly emoji: string;

    /**
     * Primary hero gradient color.
     */
    readonly heroColor: string;

    /**
     * Secondary hero gradient color.
     */
    readonly heroAccentColor: string;

    /**
     * Short hero subtitle.
     */
    readonly tagline: string;

    /**
     * Summary copy shown near the hero.
     */
    readonly summary: string;

    /**
     * Longer descriptive copy.
     */
    readonly description: string;

    /**
     * Usage guidance bullets.
     */
    readonly usageNotes: ReadonlyArray<string>;

    /**
     * Canonical pseudo-agent URL.
     */
    readonly pseudoUrl: string;

    /**
     * Case-insensitive alias examples.
     */
    readonly aliasExamples: ReadonlyArray<string>;
};

const VOID_PSEUDO_AGENT_ALIAS_EXAMPLES: ReadonlyArray<string> = [
    '{Void}',
    '{Null}',
    'Void',
    'Null',
    'void',
    'null',
    'VOID',
    'NULL',
    ...VOID_PSEUDO_AGENT_ALIAS_KEYS.filter((alias) => alias !== 'void' && alias !== 'null'),
];

const PSEUDO_AGENT_DESCRIPTOR_BY_KIND: Readonly<Record<PseudoAgentKind, PseudoAgentDescriptor>> = {
    USER: {
        kind: 'USER',
        canonicalName: 'user',
        displayName: 'User',
        emoji: '🧑‍💻',
        heroColor: '#7c3aed',
        heroAccentColor: '#a855f7',
        tagline: 'The person using this agent right now.',
        summary:
            'When an agent consults {User}, it speaks directly to the human at the keyboard through a tiny modal that captures one reply before resuming.',
        description:
            'Think of {User} as a teammate that represents you. Mention {User} inside your agent definition whenever you want the model to pause and ask for your input. Each reply is single-use, so the agent continues immediately after it arrives.',
        usageNotes: [
            'Mention {User} whenever you want the agent to pause and ask you something; the modal collects exactly one response.',
            'Every {User} reply is discarded after the agent continues, so you can treat it as a temporary signal.',
            'The modal keeps things brief and never replays earlier answers—{User} is a direct bridge to the person using the agent.',
        ],
        pseudoUrl: createPseudoAgentUrl('USER'),
        aliasExamples: ['{User}', '@User', 'User', 'user', 'USER'],
    },
    VOID: {
        kind: 'VOID',
        canonicalName: 'void',
        displayName: 'Void',
        emoji: '🕳️',
        heroColor: '#020617',
        heroAccentColor: '#1f2937',
        tagline: 'Purposeful nothingness.',
        summary: 'Use {Void} (or {Null}) to represent a blank slate or to signal that an agent should start without leaning on any existing teammate.',
        description:
            'Bring {Void} (a.k.a. {Null}) into your definitions when you want to reset context, drop inheritance, or declare intentional silence. {Void} simply marks the absence of an agent and never runs its own chat.',
        usageNotes: [
            'Invite {Void} (or {Null}) whenever you need a fresh agent or when a branch should stop without referencing another teammate.',
            'Mention {Void} to signal silence—it tells the system “nothing here” before the agent continues.',
            '{Void} never produces its own replies; it is a placeholder for emptiness and carries no history.',
        ],
        pseudoUrl: createPseudoAgentUrl('VOID'),
        aliasExamples: VOID_PSEUDO_AGENT_ALIAS_EXAMPLES,
    },
};

/**
 * Retrieves the descriptor for a pseudo-agent kind.
 *
 * @param kind - Pseudo-agent kind to render.
 * @returns Descriptor that drives the profile page.
 * @private internal helper for pseudo-agent rendering
 */
export function getPseudoAgentDescriptor(kind: PseudoAgentKind): PseudoAgentDescriptor {
    return PSEUDO_AGENT_DESCRIPTOR_BY_KIND[kind];
}

/**
 * Resolves pseudo-agent metadata from a raw reference string.
 *
 * @param reference - User-provided pseudo-agent reference (case-insensitive).
 * @returns Descriptor plus canonical name, or null when the reference is not pseudo.
 * @private internal helper for pseudo-agent routing
 */
export function resolvePseudoAgentDescriptor(
    reference: string,
): { kind: PseudoAgentKind; descriptor: PseudoAgentDescriptor } | null {
    const kind = resolvePseudoAgentKindFromReference(reference);
    if (!kind) {
        return null;
    }

    return {
        kind,
        descriptor: getPseudoAgentDescriptor(kind),
    };
}

/**
 * Returns the canonical pseudo-agent URL for the provided kind.
 *
 * @param kind - Pseudo-agent kind.
 * @returns Canonical pseudo-agent URL.
 * @private internal helper for pseudo-agent routing
 */
export function getPseudoAgentUrl(kind: PseudoAgentKind): string {
    return createPseudoAgentUrl(kind);
}
