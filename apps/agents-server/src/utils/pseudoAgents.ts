import {
    createPseudoAgentUrl,
    resolvePseudoAgentKindFromReference,
    type PseudoAgentKind,
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
            'When an agent consults {User}, it is actually talking to the human behind the keyboard. Every {User} call opens a tiny modal that asks for exactly one message, then goes back to the agent.',
        description:
            'Think of {User} as a real teammate that represents you. It only works inside TEAM commitments and can be written as {User}, @User, or any case-insensitive alias. Because the pseudo user has no profile, it cannot be used in FROM or IMPORT, and it never keeps history—each reply is a single, one-off message the agent then continues from.',
        usageNotes: [
            'Team-only: place {User} or @User inside your TEAM commitment to ask the current human for help. The modal collects one message before it closes.',
            'Each pseudo-user reply is standalone: after you submit your answer, the agent uses that text and resumes the original conversation.',
            'The modal is intentionally brief and never stores or replays your message; treat {User} as an explicit “ask the human” switch.',
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
        summary:
            '{Void} lets you drop inheritance or reference the absence of an agent. It behaves like the legacy {from void} but with consistent pseudo-agent tooling.',
        description:
            'Use {Void} whenever you want to talk about emptiness, silence, or to create an agent without parents. {Void} can appear in FROM, IMPORT, or any other commitment, and legacy aliases such as VOID, null, none, or nil are treated the same way.',
        usageNotes: [
            'Inherit from nothing: `FROM {Void}` (or legacy `FROM VOID`) creates a fresh agent with no parent or toolbox.',
            'Drop into silence: mention {Void} in TEAM or other commitments to signal “nothing here” or “no teammate”. It never runs chat, it only represents the absence of context.',
            'All aliases are case insensitive—{Void}, VOID, null, none, and nil point to the same pseudo agent.',
        ],
        pseudoUrl: createPseudoAgentUrl('VOID'),
        aliasExamples: ['{Void}', 'Void', 'void', 'VOID', 'null', 'none', 'nil'],
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
