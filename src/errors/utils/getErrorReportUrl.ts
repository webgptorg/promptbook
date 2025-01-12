import spaceTrim from 'spacetrim';
import { ADMIN_GITHUB_NAME } from '../../config';
import { NAME } from '../../config';
import { BOOK_LANGUAGE_VERSION } from '../../version';
import { PROMPTBOOK_ENGINE_VERSION } from '../../version';

/**
 * Make error report URL for the given error
 *
 * @private private within the repository
 */
export function getErrorReportUrl(error: Error): URL {
    const report = {
        title: `🐜 Error report from ${NAME}`,
        body: spaceTrim(
            (block) => `


            \`${error.name || 'Error'}\` has occurred in the [${NAME}], please look into it @${ADMIN_GITHUB_NAME}.

            \`\`\`
            ${block(error.message || '(no error message)')}
            \`\`\`


            ## More info:

            - **Promptbook engine version:** ${PROMPTBOOK_ENGINE_VERSION}
            - **Book language version:** ${BOOK_LANGUAGE_VERSION}
            - **Time:** ${new Date().toISOString()}

            <details>
            <summary>Stack trace:</summary>

            ## Stack trace:

            \`\`\`stacktrace
            ${block(error.stack || '(empty)')}
            \`\`\`
            </details>

        `, // <- TODO: Add all registrations - llm providers and scrapers
        ),
    };

    const reportUrl = new URL(`https://github.com/webgptorg/promptbook/issues/new`);
    reportUrl.searchParams.set('labels', 'bug');
    reportUrl.searchParams.set('assignees', ADMIN_GITHUB_NAME);
    reportUrl.searchParams.set('title', report.title);
    reportUrl.searchParams.set('body', report.body);

    return reportUrl;
}
