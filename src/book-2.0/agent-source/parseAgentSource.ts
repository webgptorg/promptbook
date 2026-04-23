import { spaceTrim } from 'spacetrim';
import { TODO_any } from '../../_packages/types.index';
import type { ParsedCommitment } from '../../commitments/_base/ParsedCommitment';
import { parseUseProjectCommitmentContent } from '../../commitments/USE_PROJECT/projectReference';
import { normalizeTo_camelCase } from '../../utils/normalization/normalizeTo_camelCase';
import { extractUrlsFromText } from '../../utils/validators/url/extractUrlsFromText';
import { normalizeDomainForMatching } from '../../utils/validators/url/normalizeDomainForMatching';
import type { AgentBasicInformation, AgentCapability } from './AgentBasicInformation';
import { computeAgentHash } from './computeAgentHash';
import { createDefaultAgentName } from './createDefaultAgentName';
import { normalizeAgentName } from './normalizeAgentName';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { parseParameters } from './parseParameters';
import { parseTeamCommitmentContent } from './parseTeamCommitment';
import { VOID_PSEUDO_AGENT_REFERENCE, isVoidPseudoAgentReference } from './pseudoAgentReferences';
import type { string_book } from './string_book';

/**
 * Parses basic information from agent source
 *
 * There are 2 similar functions:
 * - `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
 * - `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.
 *
 * @public exported from `@promptbook/core`
 */
export function parseAgentSource(agentSource: string_book): AgentBasicInformation {
    const parseResult = parseAgentSourceWithCommitments(agentSource);
    const resolvedAgentName = parseResult.agentName || createDefaultAgentName(agentSource);
    const personaDescription = extractAgentProfileText(parseResult.commitments);
    const initialMessage = extractInitialMessage(parseResult.commitments);
    const parsedProfile = extractParsedAgentProfile(parseResult.commitments);

    ensureMetaFullname(parsedProfile.meta, resolvedAgentName);

    return {
        agentName: normalizeAgentName(resolvedAgentName),
        agentHash: computeAgentHash(agentSource),
        permanentId: parsedProfile.meta.id,
        personaDescription,
        initialMessage,
        meta: parsedProfile.meta,
        links: parsedProfile.links,
        parameters: parseParameters(agentSource),
        capabilities: parsedProfile.capabilities,
        samples: parsedProfile.samples,
        knowledgeSources: parsedProfile.knowledgeSources,
    };
}

/**
 * Parsed agent profile fields accumulated from commitments.
 *
 * @private internal utility of `parseAgentSource`
 */
type ParsedAgentProfile = Pick<
    AgentBasicInformation,
    'meta' | 'links' | 'capabilities' | 'samples' | 'knowledgeSources'
>;

/**
 * Mutable commitment-processing state used while collecting basic profile information.
 *
 * @private internal utility of `parseAgentSource`
 */
type ParseAgentSourceState = ParsedAgentProfile & {
    pendingUserMessage: string | null;
    knownKnowledgeSourceUrls: Set<string>;
};

/**
 * Minimal display data for KNOWLEDGE capability badges.
 *
 * @private internal utility of `parseAgentSource`
 */
type KnowledgeCapabilityPresentation = Pick<AgentCapability, 'label' | 'iconName'>;

/**
 * Applies one dedicated META-like commitment content into the parsed profile state.
 *
 * @private internal utility of `parseAgentSource`
 */
type MetaCommitmentApplier = (state: ParseAgentSourceState, content: string) => void;

/**
 * Static capability descriptors for commitments that map one-to-one to a visible capability.
 *
 * @private internal utility of `parseAgentSource`
 */
const SIMPLE_CAPABILITY_BY_COMMITMENT_TYPE: Readonly<Record<string, AgentCapability | undefined>> = {
    'USE BROWSER': {
        type: 'browser',
        label: 'Browser',
        iconName: 'Globe',
    },
    'USE SEARCH ENGINE': {
        type: 'search-engine',
        label: 'Internet',
        iconName: 'Search',
    },
    'USE SEARCH': {
        type: 'search-engine',
        label: 'Internet',
        iconName: 'Search',
    },
    'USE DEEPSEARCH': {
        type: 'search-engine',
        label: 'DeepSearch',
        iconName: 'Search',
    },
    'USE TIME': {
        type: 'time',
        label: 'Time',
        iconName: 'Clock',
    },
    'USE TIMEOUT': {
        type: 'timeout',
        label: 'Timers',
        iconName: 'Clock',
    },
    'USE USER LOCATION': {
        type: 'user-location',
        label: 'User location',
        iconName: 'MapPin',
    },
    'USE EMAIL': {
        type: 'email',
        label: 'Email',
        iconName: 'Mail',
    },
    'USE POPUP': {
        type: 'popup',
        label: 'Popup',
        iconName: 'SquareArrowOutUpRight',
    },
    'USE IMAGE GENERATOR': {
        type: 'image-generator',
        label: 'Image Generator',
        iconName: 'Image',
    },
    'USE PRIVACY': {
        type: 'privacy',
        label: 'Privacy',
        iconName: 'Shield',
    },
    'USE CALENDAR': {
        type: 'calendar',
        label: 'Calendar',
        iconName: 'Calendar',
    },
};

/**
 * Dedicated handlers for META-style commitments that directly map onto parsed meta fields.
 *
 * @private internal utility of `parseAgentSource`
 */
const META_COMMITMENT_APPLIERS: Readonly<Record<string, MetaCommitmentApplier | undefined>> = {
    'META LINK': applyMetaLinkContent,
    'META DOMAIN': applyMetaDomainContent,
    'META IMAGE': applyMetaImageContent,
    'META DESCRIPTION': applyMetaDescriptionContent,
    'META DISCLAIMER': applyMetaDisclaimerContent,
    'META INPUT PLACEHOLDER': applyMetaInputPlaceholderContent,
    'MESSAGE SUFFIX': applyMessageSuffixContent,
    'META COLOR': applyMetaColorContent,
    'META FONT': applyMetaFontContent,
    'META VOICE': applyMetaVoiceContent,
};

/**
 * Detects local slash-based references used by FROM and IMPORT commitments.
 *
 * @private internal utility of `parseAgentSource`
 */
const LOCAL_AGENT_REFERENCE_PREFIXES = ['./', '../', '/'];

/**
 * Resolves the public agent profile text from the last GOAL/GOALS commitment,
 * falling back to the deprecated PERSONA/PERSONAE commitments when no goal exists.
 *
 * @private internal utility of `parseAgentSource`
 */
function extractAgentProfileText(commitments: ReadonlyArray<ParsedCommitment>): string | null {
    let goalDescription = '';
    let hasGoalDescription = false;
    let personaDescription = '';
    let hasPersonaDescription = false;

    for (const commitment of commitments) {
        if (commitment.type === 'GOAL' || commitment.type === 'GOALS') {
            goalDescription = commitment.content;
            hasGoalDescription = true;
        }

        if (commitment.type === 'PERSONA' || commitment.type === 'PERSONAE') {
            personaDescription = commitment.content;
            hasPersonaDescription = true;
        }
    }

    if (hasGoalDescription) {
        return goalDescription;
    }

    if (hasPersonaDescription) {
        return personaDescription;
    }

    return null;
}

/**
 * Resolves the last INITIAL MESSAGE commitment, which is the public initial-message value.
 *
 * @private internal utility of `parseAgentSource`
 */
function extractInitialMessage(commitments: ReadonlyArray<ParsedCommitment>): string | null {
    let initialMessage: string | null = null;

    for (const commitment of commitments) {
        if (commitment.type === 'INITIAL MESSAGE') {
            initialMessage = commitment.content;
        }
    }

    return initialMessage;
}

/**
 * Collects capability, sample, meta, link, and knowledge-source data from commitments.
 *
 * @private internal utility of `parseAgentSource`
 */
function extractParsedAgentProfile(commitments: ReadonlyArray<ParsedCommitment>): ParsedAgentProfile {
    const state: ParseAgentSourceState = {
        meta: {},
        links: [],
        capabilities: [],
        samples: [],
        knowledgeSources: [],
        pendingUserMessage: null,
        knownKnowledgeSourceUrls: new Set<string>(),
    };

    for (const commitment of commitments) {
        processParsedCommitment(state, commitment);
    }

    return {
        meta: state.meta,
        links: state.links,
        capabilities: state.capabilities,
        samples: state.samples,
        knowledgeSources: state.knowledgeSources,
    };
}

/**
 * Processes one parsed commitment through the sample, capability, and meta stages.
 *
 * @private internal utility of `parseAgentSource`
 */
function processParsedCommitment(state: ParseAgentSourceState, commitment: ParsedCommitment): void {
    if (consumeConversationSampleCommitment(state, commitment)) {
        return;
    }

    const capabilities = createCapabilitiesFromCommitment(state, commitment);
    if (capabilities.length > 0) {
        state.capabilities.push(...capabilities);
        return;
    }

    applyMetaCommitment(state, commitment);
}

/**
 * Updates sample-conversation state for communication commitments.
 *
 * @private internal utility of `parseAgentSource`
 */
function consumeConversationSampleCommitment(state: ParseAgentSourceState, commitment: ParsedCommitment): boolean {
    switch (commitment.type) {
        case 'INITIAL MESSAGE':
            state.samples.push({ question: null, answer: commitment.content });
            return true;
        case 'USER MESSAGE':
            state.pendingUserMessage = commitment.content;
            return true;
        case 'INTERNAL MESSAGE':
            // INTERNAL MESSAGE stores trace payloads and is intentionally ignored in basic profile samples.
            return true;
        case 'AGENT MESSAGE':
            if (state.pendingUserMessage !== null) {
                state.samples.push({ question: state.pendingUserMessage, answer: commitment.content });
                state.pendingUserMessage = null;
            }
            return true;
        default:
            return false;
    }
}

/**
 * Creates the visible capabilities produced by one parsed commitment.
 *
 * @private internal utility of `parseAgentSource`
 */
function createCapabilitiesFromCommitment(
    state: ParseAgentSourceState,
    commitment: ParsedCommitment,
): AgentCapability[] {
    const simpleCapability = createSimpleCapability(commitment.type);
    if (simpleCapability) {
        return [simpleCapability];
    }

    switch (commitment.type) {
        case 'USE PROJECT':
            return [createProjectCapability(commitment.content)];
        case 'FROM': {
            const inheritanceCapability = createInheritanceCapability(commitment.content);
            return inheritanceCapability ? [inheritanceCapability] : [];
        }
        case 'IMPORT':
            return [createImportCapability(commitment.content)];
        case 'TEAM':
            return createTeamCapabilities(commitment.content);
        case 'KNOWLEDGE':
            return [createKnowledgeCapability(state, commitment.content)];
        default:
            return [];
    }
}

/**
 * Clones one static capability descriptor for a simple capability commitment.
 *
 * @private internal utility of `parseAgentSource`
 */
function createSimpleCapability(commitmentType: string): AgentCapability | null {
    const capability = SIMPLE_CAPABILITY_BY_COMMITMENT_TYPE[commitmentType];
    return capability ? { ...capability } : null;
}

/**
 * Creates the USE PROJECT capability badge.
 *
 * @private internal utility of `parseAgentSource`
 */
function createProjectCapability(content: string): AgentCapability {
    const parsedProjectCommitment = parseUseProjectCommitmentContent(content);
    const projectLabel = parsedProjectCommitment.repository?.slug || 'Project';

    return {
        type: 'project',
        label: projectLabel,
        iconName: 'Code',
    };
}

/**
 * Creates the FROM inheritance capability when the reference should stay visible in the profile.
 *
 * @private internal utility of `parseAgentSource`
 */
function createInheritanceCapability(content: string): AgentCapability | null {
    const reference = extractFirstCommitmentLine(content);

    if (reference === 'Adam' || reference === '' /* <- Note: Adam is implicit */) {
        return null;
    }

    let label = reference;
    let iconName = 'SquareArrowOutUpRight';

    if (isLocalAgentReference(reference)) {
        label = reference.split('/').pop() || reference;
        iconName = 'SquareArrowUpRight';
    }

    if (isVoidPseudoAgentReference(reference)) {
        label = VOID_PSEUDO_AGENT_REFERENCE; // <- {Void} label
        iconName = 'ShieldAlert';
        return null; // <- Note: Do not show `{Void}` in capabilities, it's only used for internal logic
    }

    return {
        type: 'inheritance',
        label,
        iconName,
        agentUrl: reference as TODO_any,
    };
}

/**
 * Creates the IMPORT capability badge.
 *
 * @private internal utility of `parseAgentSource`
 */
function createImportCapability(content: string): AgentCapability {
    const reference = extractFirstCommitmentLine(content);
    let label = reference;
    let iconName = 'ExternalLink';

    try {
        if (reference.startsWith('http://') || reference.startsWith('https://')) {
            const url = new URL(reference);
            label = `${url.hostname.replace(/^www\./, '')}.../${url.pathname.split('/').pop()}`;
        } else if (isLocalAgentReference(reference)) {
            label = reference.split('/').pop() || reference;
            iconName = 'Link';
        }
    } catch (error) {
        // Invalid URL or path, keep default label.
    }

    return {
        type: 'import',
        label,
        iconName,
        agentUrl: reference as TODO_any,
    };
}

/**
 * Creates TEAM capability badges for all parsed teammates.
 *
 * @private internal utility of `parseAgentSource`
 */
function createTeamCapabilities(content: string): AgentCapability[] {
    const teammates = parseTeamCommitmentContent(content);

    return teammates.map((teammate) => ({
        type: 'team',
        label: teammate.label,
        iconName: 'Users',
        agentUrl: teammate.url as TODO_any,
    }));
}

/**
 * Creates the KNOWLEDGE capability badge and records URL-based knowledge sources.
 *
 * @private internal utility of `parseAgentSource`
 */
function createKnowledgeCapability(state: ParseAgentSourceState, content: string): AgentCapability {
    const trimmedContent = spaceTrim(content);
    const extractedUrls = extractUrlsFromText(trimmedContent);

    rememberKnowledgeSources(state, extractedUrls);

    const presentation = createKnowledgeCapabilityPresentation(trimmedContent, extractedUrls);
    return {
        type: 'knowledge',
        label: presentation.label,
        iconName: presentation.iconName,
    };
}

/**
 * Stores unique URL-based knowledge sources for later citation resolution.
 *
 * @private internal utility of `parseAgentSource`
 */
function rememberKnowledgeSources(state: ParseAgentSourceState, extractedUrls: ReadonlyArray<string>): void {
    for (const extractedUrl of extractedUrls) {
        if (state.knownKnowledgeSourceUrls.has(extractedUrl)) {
            continue;
        }

        try {
            const urlObject = new URL(extractedUrl);
            const pathSegment = decodeURIComponent(urlObject.pathname.split('/').pop() || '');
            const filename = pathSegment || urlObject.hostname;

            state.knowledgeSources.push({
                url: extractedUrl,
                filename,
            });
            state.knownKnowledgeSourceUrls.add(extractedUrl);
        } catch (error) {
            // Invalid URL, ignore in profile metadata.
        }
    }
}

/**
 * Derives the visible KNOWLEDGE badge label and icon from commitment content.
 *
 * @private internal utility of `parseAgentSource`
 */
function createKnowledgeCapabilityPresentation(
    content: string,
    extractedUrls: ReadonlyArray<string>,
): KnowledgeCapabilityPresentation {
    let label = content;
    let iconName = 'Book';

    if (extractedUrls.length === 0) {
        return {
            label: createKnowledgeTextLabel(content),
            iconName,
        };
    }

    try {
        const primaryUrl = extractedUrls[0]!;
        const url = new URL(primaryUrl);
        const filename = decodeURIComponent(url.pathname.split('/').pop() || '');

        if (url.pathname.endsWith('.pdf')) {
            label = filename || 'Document.pdf';
            iconName = 'FileText';
        } else {
            label = url.hostname.replace(/^www\./, '');
        }

        if (extractedUrls.length > 1) {
            label = `${label} (+${extractedUrls.length - 1})`;
        }
    } catch (error) {
        // Invalid URL, keep the text-based fallback label.
    }

    return { label, iconName };
}

/**
 * Shortens text-only KNOWLEDGE commitments into the same preview label as before.
 *
 * @private internal utility of `parseAgentSource`
 */
function createKnowledgeTextLabel(content: string): string {
    const words = content.split(/\s+/);
    if (words.length > 4) {
        return `${words.slice(0, 4).join(' ')}...`;
    }

    return content;
}

/**
 * Applies META-style commitments that mutate parsed profile metadata.
 *
 * @private internal utility of `parseAgentSource`
 */
function applyMetaCommitment(state: ParseAgentSourceState, commitment: ParsedCommitment): void {
    const applyMetaContent = META_COMMITMENT_APPLIERS[commitment.type];
    if (applyMetaContent) {
        applyMetaContent(state, commitment.content);
        return;
    }

    if (commitment.type === 'META') {
        applyGenericMetaCommitment(state, commitment.content);
    }
}

/**
 * Applies the generic META commitment form (`META TYPE value`).
 *
 * @private internal utility of `parseAgentSource`
 */
function applyGenericMetaCommitment(state: ParseAgentSourceState, content: string): void {
    const metaTypeRaw = content.split(' ')[0] || 'NONE';
    const metaValue = spaceTrim(content.substring(metaTypeRaw.length));

    if (metaTypeRaw === 'LINK') {
        state.links.push(metaValue);
    }

    const metaType = normalizeTo_camelCase(metaTypeRaw);
    state.meta[metaType] = metaValue;
}

/**
 * Applies META LINK content into links and the canonical `meta.link` field.
 *
 * @private internal utility of `parseAgentSource`
 */
function applyMetaLinkContent(state: ParseAgentSourceState, content: string): void {
    const linkValue = spaceTrim(content);
    state.links.push(linkValue);
    state.meta.link = linkValue;
}

/**
 * Applies META DOMAIN content into the normalized `meta.domain` field.
 *
 * @private internal utility of `parseAgentSource`
 */
function applyMetaDomainContent(state: ParseAgentSourceState, content: string): void {
    state.meta.domain = normalizeMetaDomain(content);
}

/**
 * Applies META IMAGE content into the canonical `meta.image` field.
 *
 * @private internal utility of `parseAgentSource`
 */
function applyMetaImageContent(state: ParseAgentSourceState, content: string): void {
    state.meta.image = spaceTrim(content);
}

/**
 * Applies META DESCRIPTION content into the canonical `meta.description` field.
 *
 * @private internal utility of `parseAgentSource`
 */
function applyMetaDescriptionContent(state: ParseAgentSourceState, content: string): void {
    state.meta.description = spaceTrim(content);
}

/**
 * Applies META DISCLAIMER content into the canonical `meta.disclaimer` field.
 *
 * @private internal utility of `parseAgentSource`
 */
function applyMetaDisclaimerContent(state: ParseAgentSourceState, content: string): void {
    state.meta.disclaimer = content;
}

/**
 * Applies META INPUT PLACEHOLDER content into the canonical `meta.inputPlaceholder` field.
 *
 * @private internal utility of `parseAgentSource`
 */
function applyMetaInputPlaceholderContent(state: ParseAgentSourceState, content: string): void {
    state.meta.inputPlaceholder = spaceTrim(content);
}

/**
 * Applies MESSAGE SUFFIX content into the canonical `meta.messageSuffix` field.
 *
 * @private internal utility of `parseAgentSource`
 */
function applyMessageSuffixContent(state: ParseAgentSourceState, content: string): void {
    state.meta.messageSuffix = content;
}

/**
 * Applies META COLOR content into the canonical `meta.color` field.
 *
 * @private internal utility of `parseAgentSource`
 */
function applyMetaColorContent(state: ParseAgentSourceState, content: string): void {
    state.meta.color = normalizeSeparator(content);
}

/**
 * Applies META FONT content into the canonical `meta.font` field.
 *
 * @private internal utility of `parseAgentSource`
 */
function applyMetaFontContent(state: ParseAgentSourceState, content: string): void {
    state.meta.font = normalizeSeparator(content);
}

/**
 * Applies META VOICE content into the canonical `meta.voice` field.
 *
 * @private internal utility of `parseAgentSource`
 */
function applyMetaVoiceContent(state: ParseAgentSourceState, content: string): void {
    state.meta.voice = spaceTrim(content);
}

/**
 * Ensures the parsed profile always exposes a fullname value.
 *
 * @private internal utility of `parseAgentSource`
 */
function ensureMetaFullname(meta: AgentBasicInformation['meta'], fallbackFullname: string): void {
    if (!meta.fullname) {
        meta.fullname = fallbackFullname;
    }
}

/**
 * Extracts the first logical line from multiline commitment content.
 *
 * @private internal utility of `parseAgentSource`
 */
function extractFirstCommitmentLine(content: string): string {
    return spaceTrim(content).split(/\r?\n/)[0] || '';
}

/**
 * Detects local FROM/IMPORT references that should use local-link labels and icons.
 *
 * @private internal utility of `parseAgentSource`
 */
function isLocalAgentReference(reference: string): boolean {
    return LOCAL_AGENT_REFERENCE_PREFIXES.some((prefix) => reference.startsWith(prefix));
}

/**
 * Normalizes the separator in the content
 *
 * @param content - The content to normalize
 * @returns The content with normalized separators
 *
 * @private internal utility of `parseAgentSource`
 */
function normalizeSeparator(content: string): string {
    const trimmed = spaceTrim(content);
    if (trimmed.includes(',')) {
        return trimmed;
    }
    return trimmed.split(/\s+/).join(', ');
}

/**
 * Normalizes META DOMAIN content to a hostname-like value when possible.
 *
 * @param content - Raw META DOMAIN content.
 * @returns Normalized domain or a trimmed fallback.
 *
 * @private internal utility of `parseAgentSource`
 */
function normalizeMetaDomain(content: string): string {
    const trimmed = spaceTrim(content);
    return normalizeDomainForMatching(trimmed) || trimmed.toLowerCase();
}

// TODO: [🕛] Unite `AgentBasicInformation`, `ChatParticipant`, `LlmExecutionTools` +  `LlmToolsMetadata`
