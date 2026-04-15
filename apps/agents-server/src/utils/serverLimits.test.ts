import { describe, expect, it } from '@jest/globals';
import { DEFAULT_SERVER_LIMIT_VALUES, SERVER_LIMIT_KEYS } from '../constants/serverLimits';
import { normalizeServerLimitValues } from './serverLimits';

describe('normalizeServerLimitValues', () => {
    it('falls back to defaults for invalid values while preserving valid integers', () => {
        const normalizedValues = normalizeServerLimitValues({
            [SERVER_LIMIT_KEYS.TIMEOUT_MAX_ACTIVE_PER_CHAT]: '9',
            [SERVER_LIMIT_KEYS.TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT]: 0,
            [SERVER_LIMIT_KEYS.MAX_FILE_UPLOAD_SIZE_MB]: -1,
            [SERVER_LIMIT_KEYS.FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS]: '1500',
            [SERVER_LIMIT_KEYS.SPAWN_AGENT_MAX_DEPTH]: 4.9,
            [SERVER_LIMIT_KEYS.SPAWN_AGENT_RATE_LIMIT_MAX]: '12',
            [SERVER_LIMIT_KEYS.SPAWN_AGENT_RATE_LIMIT_WINDOW_MS]: 500,
        });

        expect(normalizedValues).toEqual({
            [SERVER_LIMIT_KEYS.TIMEOUT_MAX_ACTIVE_PER_CHAT]: 9,
            [SERVER_LIMIT_KEYS.TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT]:
                DEFAULT_SERVER_LIMIT_VALUES[SERVER_LIMIT_KEYS.TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT],
            [SERVER_LIMIT_KEYS.MAX_FILE_UPLOAD_SIZE_MB]:
                DEFAULT_SERVER_LIMIT_VALUES[SERVER_LIMIT_KEYS.MAX_FILE_UPLOAD_SIZE_MB],
            [SERVER_LIMIT_KEYS.FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS]: 1500,
            [SERVER_LIMIT_KEYS.SPAWN_AGENT_MAX_DEPTH]: 4,
            [SERVER_LIMIT_KEYS.SPAWN_AGENT_RATE_LIMIT_MAX]: 12,
            [SERVER_LIMIT_KEYS.SPAWN_AGENT_RATE_LIMIT_WINDOW_MS]:
                DEFAULT_SERVER_LIMIT_VALUES[SERVER_LIMIT_KEYS.SPAWN_AGENT_RATE_LIMIT_WINDOW_MS],
        });
    });
});
