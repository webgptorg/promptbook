import { describe, expect, it } from '@jest/globals';
import { CHAT_VISUAL_MODE_OPTIONS, CHAT_VISUAL_MODE_METADATA_KEY } from '../constants/chatVisualMode';
import {
    DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY,
    DEFAULT_AGENT_AVATAR_VISUAL_METADATA_OPTIONS,
} from '../constants/defaultAgentAvatarVisual';
import { NAME_POOL_METADATA_KEY, NAME_POOL_OPTIONS } from '../constants/namePool';
import { NEW_AGENT_WIZZARD_METADATA_KEY, NEW_AGENT_WIZZARD_OPTIONS } from '../constants/newAgentWizard';
import { DEFAULT_THEME_METADATA_KEY, THEME_MODE_OPTIONS } from '../constants/themeMode';
import { SERVER_LANGUAGE_OPTIONS, SERVER_LANGUAGE_METADATA_KEY } from '../languages/ServerLanguageRegistry';
import { DEFAULT_VISIBILITY_METADATA_KEY, AGENT_VISIBILITY_OPTIONS } from '../utils/agentVisibility';
import { CHAT_FEEDBACK_MODE_OPTIONS } from '../utils/chatFeedbackMode';
import { SERVER_VISIBILITY_METADATA_KEY, SERVER_VISIBILITY_OPTIONS } from '../utils/serverVisibility';
import { getMetadataDefinition, validateMetadataValue } from './metadataDefaults';

describe('metadata defaults enum options', () => {
    it('exposes predefined options for enum-like metadata entries', () => {
        expect(getMetadataDefinition(SERVER_LANGUAGE_METADATA_KEY)?.options).toEqual(SERVER_LANGUAGE_OPTIONS);
        expect(getMetadataDefinition(SERVER_VISIBILITY_METADATA_KEY)?.options).toEqual(SERVER_VISIBILITY_OPTIONS);
        expect(getMetadataDefinition('CHAT_FEEDBACK_MODE')?.options).toEqual(CHAT_FEEDBACK_MODE_OPTIONS);
        expect(getMetadataDefinition(CHAT_VISUAL_MODE_METADATA_KEY)?.options).toEqual(CHAT_VISUAL_MODE_OPTIONS);
        expect(getMetadataDefinition(DEFAULT_THEME_METADATA_KEY)?.options).toEqual(THEME_MODE_OPTIONS);
        expect(getMetadataDefinition(NAME_POOL_METADATA_KEY)?.options).toEqual(NAME_POOL_OPTIONS);
        expect(getMetadataDefinition(DEFAULT_VISIBILITY_METADATA_KEY)?.options).toEqual(AGENT_VISIBILITY_OPTIONS);
        expect(getMetadataDefinition(NEW_AGENT_WIZZARD_METADATA_KEY)?.options).toEqual(NEW_AGENT_WIZZARD_OPTIONS);
        expect(getMetadataDefinition(DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY)?.options).toEqual(
            DEFAULT_AGENT_AVATAR_VISUAL_METADATA_OPTIONS.map(({ metadataValue, title }) => ({
                value: metadataValue,
                label: title,
            })),
        );
    });

    it('rejects unsupported enum values while allowing supported ones', () => {
        expect(validateMetadataValue(DEFAULT_AGENT_AVATAR_VISUAL_METADATA_KEY, 'NOT_A_REAL_VISUAL')).toContain(
            'Allowed values:',
        );
        expect(validateMetadataValue(DEFAULT_THEME_METADATA_KEY, 'SEPIA')).toContain('Allowed values:');
        expect(validateMetadataValue(DEFAULT_THEME_METADATA_KEY, THEME_MODE_OPTIONS[0]!.value)).toBeNull();
        expect(validateMetadataValue(CHAT_VISUAL_MODE_METADATA_KEY, CHAT_VISUAL_MODE_OPTIONS[0]!.value)).toBeNull();
        expect(validateMetadataValue('SERVER_NAME', 'Anything goes')).toBeNull();
    });
});
