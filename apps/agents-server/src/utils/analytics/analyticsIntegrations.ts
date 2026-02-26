import { getMetadataMap } from '../../database/getMetadata';
import {
    ANALYTICS_METADATA_KEYS,
    AnalyticsSettings,
    formatBooleanFlag,
    mapMetadataToAnalyticsSettings,
} from '../../constants/analyticsMetadata';

/**
 * Escapes single quotes and backslashes to safely inject user-provided IDs into JavaScript strings.
 * @private
 */
function escapeForSingleQuotes(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Builds the Google Analytics snippet powered by gtag.js.
 * @private
 */
function buildGoogleAnalyticsSnippet(settings: AnalyticsSettings): string | null {
    const measurementId = settings.googleMeasurementId.trim();
    if (!measurementId) {
        return null;
    }

    const safeMeasurementId = escapeForSingleQuotes(measurementId);
    const sendPageView = formatBooleanFlag(settings.googleAutoPageView);
    const anonymizeIp = formatBooleanFlag(settings.googleAnonymizeIp);
    const allowAdPersonalization = formatBooleanFlag(settings.googleAdPersonalization);

    return [
        '(function () {',
        '    if (window.__promptbookGoogleAnalyticsLoaded) {',
        '        return;',
        '    }',
        '    window.__promptbookGoogleAnalyticsLoaded = true;',
        `    const measurementId = '${safeMeasurementId}';`,
        '    const head = document.head || document.documentElement;',
        '    const gtagScript = document.createElement(\'script\');',
        '    gtagScript.async = true;',
        '    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;',
        '    head.appendChild(gtagScript);',
        '    window.dataLayer = window.dataLayer || [];',
        '    function gtag() {',
        '        window.dataLayer.push(arguments);',
        '    }',
        '    gtag(\'js\', new Date());',
        '    gtag(\'config\', measurementId, {',
        `        send_page_view: ${sendPageView},`,
        `        anonymize_ip: ${anonymizeIp},`,
        `        allow_ad_personalization_signals: ${allowAdPersonalization},`,
        '    });',
        '})();',
    ].join('\\n');
}

/**
 * Builds the Smartsapp JavaScript integration snippet.
 * @private
 */
function buildSmartsappSnippet(settings: AnalyticsSettings): string | null {
    const workspaceId = settings.smartsappWorkspaceId.trim();
    if (!workspaceId) {
        return null;
    }

    const safeWorkspaceId = escapeForSingleQuotes(workspaceId);
    const autoPageView = formatBooleanFlag(settings.smartsappAutoPageView);
    const captureErrors = formatBooleanFlag(settings.smartsappCaptureErrors);

    return [
        '(function () {',
        '    if (window.__promptbookSmartsappLoaded) {',
        '        return;',
        '    }',
        '    window.__promptbookSmartsappLoaded = true;',
        `    const workspaceId = '${safeWorkspaceId}';`,
        '    window.smartsapp =',
        '        window.smartsapp ||',
        '        function () {',
        '            (window.smartsappQueue = window.smartsappQueue || []).push(arguments);',
        '        };',
        '    window.smartsapp(\'init\', {',
        '        workspaceId,',
        `        autoPageView: ${autoPageView},`,
        `        captureErrors: ${captureErrors},`,
        '    });',
        '    const script = document.createElement(\'script\');',
        '    script.async = true;',
        '    script.src = \'https://cdn.smartsapp.com/sdk.js\';',
        '    script.dataset.promptbook = \'smartsapp\';',
        '    const head = document.head || document.documentElement;',
        '    head.appendChild(script);',
        '})();',
    ].join('\\n');
}

/**
 * Builds the analytics integration JavaScript that is injected alongside custom scripts.
 * @private
 */
export async function getAnalyticsCustomJavascript(): Promise<string> {
    const metadata = await getMetadataMap(ANALYTICS_METADATA_KEYS);
    const settings = mapMetadataToAnalyticsSettings(metadata);
    const snippets = [buildGoogleAnalyticsSnippet(settings), buildSmartsappSnippet(settings)].filter(
        (snippet): snippet is string => Boolean(snippet),
    );
    return snippets.join('\\n\\n');
}
