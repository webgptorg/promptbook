import {
    ACTIVE_CODER_RUN_UI_REFRESH_INTERVAL_MS,
    getCoderRunUiAutoRefreshInterval,
    isCoderRunUiAutoRefreshing,
} from './coderRunUiRefresh';

describe('getCoderRunUiAutoRefreshInterval', () => {
    it('shares one animation gate for both timed refreshes and visual animation', () => {
        expect(isCoderRunUiAutoRefreshing('initializing', 'RUNNING')).toBe(true);
        expect(isCoderRunUiAutoRefreshing('running', 'RUNNING')).toBe(true);
        expect(isCoderRunUiAutoRefreshing('waiting', 'RUNNING')).toBe(false);
        expect(isCoderRunUiAutoRefreshing('running', 'PAUSED')).toBe(false);
    });

    it('keeps automatic refreshes only for active running phases', () => {
        expect(getCoderRunUiAutoRefreshInterval('initializing', 'RUNNING')).toBe(
            ACTIVE_CODER_RUN_UI_REFRESH_INTERVAL_MS,
        );
        expect(getCoderRunUiAutoRefreshInterval('loading', 'RUNNING')).toBe(
            ACTIVE_CODER_RUN_UI_REFRESH_INTERVAL_MS,
        );
        expect(getCoderRunUiAutoRefreshInterval('running', 'RUNNING')).toBe(
            ACTIVE_CODER_RUN_UI_REFRESH_INTERVAL_MS,
        );
        expect(getCoderRunUiAutoRefreshInterval('verifying', 'RUNNING')).toBe(
            ACTIVE_CODER_RUN_UI_REFRESH_INTERVAL_MS,
        );
    });

    it('stops automatic refreshes while the UI should stay visually still', () => {
        expect(getCoderRunUiAutoRefreshInterval('waiting', 'RUNNING')).toBeUndefined();
        expect(getCoderRunUiAutoRefreshInterval('paused', 'RUNNING')).toBeUndefined();
        expect(getCoderRunUiAutoRefreshInterval('done', 'RUNNING')).toBeUndefined();
        expect(getCoderRunUiAutoRefreshInterval('error', 'RUNNING')).toBeUndefined();
        expect(getCoderRunUiAutoRefreshInterval('running', 'PAUSING')).toBeUndefined();
        expect(getCoderRunUiAutoRefreshInterval('running', 'PAUSED')).toBeUndefined();
    });
});
