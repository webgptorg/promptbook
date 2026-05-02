import { spaceTrim } from 'spacetrim';
import { resolveAvatarVisualId } from '../../../avatars/visuals/avatarVisualRegistry';
import { normalizeTo_camelCase } from '../../../utils/normalization/normalizeTo_camelCase';
import { normalizeDomainForMatching } from '../../../utils/validators/url/normalizeDomainForMatching';
import type { ParsedCommitment } from '../../../commitments/_base/ParsedCommitment';
import type { ParseAgentSourceState } from './ParseAgentSourceState';

/**
 * Applies one dedicated META-like commitment content into the parsed profile state.
 */
type MetaCommitmentApplier = (state: ParseAgentSourceState, content: string) => void;

/**
 * Dedicated handlers for META-style commitments that directly map onto parsed meta fields.
 */
const META_COMMITMENT_APPLIERS: Readonly<Record<string, MetaCommitmentApplier | undefined>> = {
    'META AVATAR': applyMetaAvatarContent,
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
 * Applies META-style commitments that mutate parsed profile metadata.
 *
 * @private internal utility of `parseAgentSource`
 */
export function applyMetaCommitment(state: ParseAgentSourceState, commitment: ParsedCommitment): void {
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
 */
function applyGenericMetaCommitment(state: ParseAgentSourceState, content: string): void {
    const metaTypeRaw = content.split(' ')[0] || 'NONE';
    const metaValue = spaceTrim(content.substring(metaTypeRaw.length));

    if (metaTypeRaw === 'LINK') {
        state.links.push(metaValue);
    }

    if (metaTypeRaw.toUpperCase() === 'AVATAR') {
        applyMetaAvatarContent(state, metaValue);
        return;
    }

    const metaType = normalizeTo_camelCase(metaTypeRaw);
    state.meta[metaType] = metaValue;
}

/**
 * Applies META AVATAR content into the canonical `meta.avatar` field.
 */
function applyMetaAvatarContent(state: ParseAgentSourceState, content: string): void {
    const avatarVisualId = resolveAvatarVisualId(content);
    if (avatarVisualId) {
        state.meta.avatar = avatarVisualId;
        return;
    }

    delete state.meta.avatar;
}

/**
 * Applies META LINK content into links and the canonical `meta.link` field.
 */
function applyMetaLinkContent(state: ParseAgentSourceState, content: string): void {
    const linkValue = spaceTrim(content);
    state.links.push(linkValue);
    state.meta.link = linkValue;
}

/**
 * Applies META DOMAIN content into the normalized `meta.domain` field.
 */
function applyMetaDomainContent(state: ParseAgentSourceState, content: string): void {
    state.meta.domain = normalizeMetaDomain(content);
}

/**
 * Applies META IMAGE content into the canonical `meta.image` field.
 */
function applyMetaImageContent(state: ParseAgentSourceState, content: string): void {
    state.meta.image = spaceTrim(content);
}

/**
 * Applies META DESCRIPTION content into the canonical `meta.description` field.
 */
function applyMetaDescriptionContent(state: ParseAgentSourceState, content: string): void {
    state.meta.description = spaceTrim(content);
}

/**
 * Applies META DISCLAIMER content into the canonical `meta.disclaimer` field.
 */
function applyMetaDisclaimerContent(state: ParseAgentSourceState, content: string): void {
    state.meta.disclaimer = content;
}

/**
 * Applies META INPUT PLACEHOLDER content into the canonical `meta.inputPlaceholder` field.
 */
function applyMetaInputPlaceholderContent(state: ParseAgentSourceState, content: string): void {
    state.meta.inputPlaceholder = spaceTrim(content);
}

/**
 * Applies MESSAGE SUFFIX content into the canonical `meta.messageSuffix` field.
 */
function applyMessageSuffixContent(state: ParseAgentSourceState, content: string): void {
    state.meta.messageSuffix = content;
}

/**
 * Applies META COLOR content into the canonical `meta.color` field.
 */
function applyMetaColorContent(state: ParseAgentSourceState, content: string): void {
    state.meta.color = normalizeSeparator(content);
}

/**
 * Applies META FONT content into the canonical `meta.font` field.
 */
function applyMetaFontContent(state: ParseAgentSourceState, content: string): void {
    state.meta.font = normalizeSeparator(content);
}

/**
 * Applies META VOICE content into the canonical `meta.voice` field.
 */
function applyMetaVoiceContent(state: ParseAgentSourceState, content: string): void {
    state.meta.voice = spaceTrim(content);
}

/**
 * Normalizes the separator in the content
 *
 * @param content - The content to normalize
 * @returns The content with normalized separators
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
 */
function normalizeMetaDomain(content: string): string {
    const trimmed = spaceTrim(content);
    return normalizeDomainForMatching(trimmed) || trimmed.toLowerCase();
}
