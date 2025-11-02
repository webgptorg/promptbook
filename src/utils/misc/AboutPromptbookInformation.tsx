import { MarkdownContent } from '../../book-components/Chat/MarkdownContent/MarkdownContent';
import type { AboutPromptbookInformationOptions } from './aboutPromptbookInformation';
import { aboutPromptbookInformation } from './aboutPromptbookInformation';

type AboutPromptbookInformationProps = AboutPromptbookInformationOptions;

export function AboutPromptbookInformation(props: AboutPromptbookInformationProps) {
    return <MarkdownContent content={aboutPromptbookInformation(props)} />;
}

/**
 * TODO: [🗽] Unite branding and make single place for it
 */
