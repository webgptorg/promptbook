import { ACTIVE_CODER_RUN_UI_REFRESH_INTERVAL_MS, getCoderRunUiAutoRefreshInterval } from './coderRunUiRefresh';

describe('getCoderRunUiAutoRefreshInterval', () => {
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
