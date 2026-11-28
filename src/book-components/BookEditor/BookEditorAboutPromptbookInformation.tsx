import { PUBLIC_AGENTS_SERVERS } from '../../../servers';
import { CLAIM, IS_COST_PREVENTED, NAME } from '../../config';
import { $detectRuntimeEnvironment } from '../../utils/environment/$detectRuntimeEnvironment';
import type { AboutPromptbookInformationOptions } from '../../utils/misc/aboutPromptbookInformation';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../version';
import styles from './BookEditor.module.css';

/**
 * Browser-safe Promptbook information used by `BookEditor`.
 *
 * The shared `AboutPromptbookInformation` component renders markdown through the
 * chat markdown pipeline, which has a server-side JSDOM sanitizer path. Keeping
 * this component plain JSX prevents BookEditor from pulling JSDOM into client
 * bundles.
 *
 * @private Internal component used by `BookEditorActionbar`
 */
export function BookEditorAboutPromptbookInformation(props: AboutPromptbookInformationOptions = {}) {
    const { isServersInfoIncluded = true, isRuntimeEnvironmentInfoIncluded = true } = props;
    const runtimeEnvironmentInfo = {
        ...$detectRuntimeEnvironment(),
        isCostPrevented: IS_COST_PREVENTED,
    };

    return (
        <div className={styles.aboutPromptbookInformation}>
            <h1>{NAME}</h1>
            <p>{CLAIM}</p>

            <ul>
                <li>
                    <a href="https://github.com/webgptorg/promptbook" target="_blank" rel="noopener noreferrer">
                        Promptbook engine version <code>{PROMPTBOOK_ENGINE_VERSION}</code>
                    </a>
                </li>
                <li>
                    <a href="https://github.com/webgptorg/book" target="_blank" rel="noopener noreferrer">
                        Book language version <code>{BOOK_LANGUAGE_VERSION}</code>
                    </a>
                </li>
            </ul>

            {isServersInfoIncluded && (
                <>
                    <h2>Servers</h2>
                    <ol>
                        {PUBLIC_AGENTS_SERVERS.map(({ title, description, url }) => (
                            <li key={url}>
                                <strong>{title}</strong> {description}{' '}
                                <a href={url} target="_blank" rel="noopener noreferrer">
                                    {url}
                                </a>
                            </li>
                        ))}
                    </ol>
                </>
            )}

            {isRuntimeEnvironmentInfoIncluded && (
                <>
                    <h2>Environment</h2>
                    <ul>
                        {Object.entries(runtimeEnvironmentInfo).map(([key, value]) => (
                            <li key={key}>
                                <strong>{key}:</strong> {String(value)}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
