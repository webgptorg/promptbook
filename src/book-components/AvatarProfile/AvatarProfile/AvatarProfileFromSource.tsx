import { parseAgentSource } from '../../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { AvatarProfile } from './AvatarProfile';
import type { AvatarProfileProps } from './AvatarProfile';

/**
 * Props of `AvatarProfileFromSource`
 *
 * @public exported from `@promptbook/components`
 */
export type AvatarProfileFromSourceProps = Omit<AvatarProfileProps, 'agent'> & {
    /**
     * Agent source to be shown
     */
    readonly agentSource: string_book;
};

/**
 * Shows a box with user avatar, name and description from a string source
 *
 * @public exported from `@promptbook/components`
 */
export function AvatarProfileFromSource(props: AvatarProfileFromSourceProps) {
    const { agentSource, ...rest } = props;
    const agent = parseAgentSource(agentSource);

    return <AvatarProfile {...rest} agent={agent} agentSource={agentSource} />;
}
