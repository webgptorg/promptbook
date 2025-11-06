import { MarkdownContent } from '../../book-components/Chat/MarkdownContent/MarkdownContent';
import type { AboutPromptbookInformationOptions } from './aboutPromptbookInformation';
import { aboutPromptbookInformation } from './aboutPromptbookInformation';
// [😺]> import logoAsset from './logo-blue-white-256.png';
// [😺]> import logo3dAsset from './logo-design-cube.stl';

type AboutPromptbookInformationProps = AboutPromptbookInformationOptions;

/**
 * Provide information about Promptbook, engine version, book language version, servers, ...
 *
 * @public exported from `@promptbook/components`
 */
export function AboutPromptbookInformation(props: AboutPromptbookInformationProps) {
    return (
        <>
            <MarkdownContent content={aboutPromptbookInformation(props)} />
        </>
    );
}

/**
 * TODO: !!! Remove "x" from filename
 * TODO: [🗽] Unite branding and make single place for it
 */
