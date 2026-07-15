import { describe, expect, it } from '@jest/globals';
import { DEFAULT_CHAT_FEEDBACK_MODE } from '../../chatFeedbackMode';
import type { CreateServerInput } from '../createManagedServer';
import { normalizeCreateServerInput } from './normalizeCreateServerInput';

/**
 * Minimal valid create-server input shared by normalizer tests.
 */
const DEFAULT_CREATE_SERVER_INPUT: CreateServerInput = {
    name: 'Acme Support',
    identifier: 'acme-support',
    environment: 'PREVIEW',
    domain: 'acme-support.ptbk.io',
    tablePrefix: 'server_AcmeSupport_',
    iconUrl: null,
    adminUser: {
        username: 'admin',
        password: 'secret-password',
        isAdmin: true,
    },
    additionalUsers: [],
    initialSettings: {
        language: 'en',
        homepageMessage: '',
        feedbackMode: 'stars',
        isFileAttachmentsEnabled: true,
        isExperimentalPwaAppEnabled: true,
        isFooterShown: true,
    },
};

describe('normalizeCreateServerInput', () => {
    it('installs default agents when older callers omit the option', () => {
        const normalizedInput = normalizeCreateServerInput(DEFAULT_CREATE_SERVER_INPUT);

        expect(normalizedInput.isDefaultAgentsInstalled).toBe(true);
    });

    it('keeps the explicit default-agent installation opt-out', () => {
        const normalizedInput = normalizeCreateServerInput({
            ...DEFAULT_CREATE_SERVER_INPUT,
            isDefaultAgentsInstalled: false,
        });

        expect(normalizedInput.isDefaultAgentsInstalled).toBe(false);
    });

    it('uses the default chat feedback mode when older callers omit it', () => {
        const normalizedInput = normalizeCreateServerInput({
            ...DEFAULT_CREATE_SERVER_INPUT,
            initialSettings: {
                language: 'en',
                homepageMessage: '',
                isFileAttachmentsEnabled: true,
                isExperimentalPwaAppEnabled: true,
                isFooterShown: true,
            },
        });

        expect(normalizedInput.metadataEntries).toContainEqual(
            expect.objectContaining({
                key: 'CHAT_FEEDBACK_MODE',
                value: DEFAULT_CHAT_FEEDBACK_MODE,
            }),
        );
    });
});
