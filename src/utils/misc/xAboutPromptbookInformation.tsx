import { MarkdownContent } from '../../book-components/Chat/MarkdownContent/MarkdownContent';
import type { AboutPromptbookInformationOptions } from './aboutPromptbookInformation';
import { aboutPromptbookInformation } from './aboutPromptbookInformation';
import logoAsset from './logo-blue-white-256.png'; // <- TODO: !!! Remove
// import logo3dAsset from './logo-design-cube.stl'; // <- TODO: !!! Remove

type AboutPromptbookInformationProps = AboutPromptbookInformationOptions;

/**
 * Provide information about Promptbook, engine version, book language version, servers, ...
 *
 * @public exported from `@promptbook/components`
 */
export function AboutPromptbookInformation(props: AboutPromptbookInformationProps) {
    console.log('!!!', { logoAsset /* logo3dAsset */ });

    return (
        <>
            <MarkdownContent content={aboutPromptbookInformation(props)} />
            <b>Logo in React:</b>
            <img src={logoAsset} alt="Logo" />
        </>
    );
}

/**
 * TODO: !!! Remove "x" from filename
 * TODO: [🗽] Unite branding and make single place for it
 */
