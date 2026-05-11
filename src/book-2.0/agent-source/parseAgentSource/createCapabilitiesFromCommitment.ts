import { spaceTrim } from 'spacetrim';
import { TODO_any } from '../../../_packages/types.index';
import { parseUseProjectCommitmentContent } from '../../../commitments/USE_PROJECT/projectReference';
import { extractUrlsFromText } from '../../../utils/validators/url/extractUrlsFromText';
import type { ParsedCommitment } from '../../../commitments/_base/ParsedCommitment';
import type { AgentCapability } from '../AgentBasicInformation';
import { parseTeamCommitmentContent } from '../parseTeamCommitment';
import { VOID_PSEUDO_AGENT_REFERENCE, isVoidPseudoAgentReference } from '../pseudoAgentReferences';
import type { ParseAgentSourceState } from './ParseAgentSourceState';

/**
 * Static capability descriptors for commitments that map one-to-one to a visible capability.
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
 * Detects local slash-based references used by FROM and IMPORT commitments.
 */
const LOCAL_AGENT_REFERENCE_PREFIXES = ['./', '../', '/'];

/**
 * Minimal display data for KNOWLEDGE capability badges.
 */
type KnowledgeCapabilityPresentation = Pick<AgentCapability, 'label' | 'iconName'>;

/**
 * Creates the visible capabilities produced by one parsed commitment.
 *
 * @private internal utility of `parseAgentSource`
 */
export function createCapabilitiesFromCommitment(
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
 */
function createSimpleCapability(commitmentType: string): AgentCapability | null {
    const capability = SIMPLE_CAPABILITY_BY_COMMITMENT_TYPE[commitmentType];
    return capability ? { ...capability } : null;
}

/**
 * Creates the USE PROJECT capability badge.
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
 */
function createKnowledgeTextLabel(content: string): string {
    const words = content.split(/\s+/);
    if (words.length > 4) {
        return `${words.slice(0, 4).join(' ')}...`;
    }

    return content;
}

/**
 * Extracts the first logical line from multiline commitment content.
 */
function extractFirstCommitmentLine(content: string): string {
    return spaceTrim(content).split(/\r?\n/)[0] || '';
}

/**
 * Detects local FROM/IMPORT references that should use local-link labels and icons.
 */
function isLocalAgentReference(reference: string): boolean {
    return LOCAL_AGENT_REFERENCE_PREFIXES.some((prefix) => reference.startsWith(prefix));
}
