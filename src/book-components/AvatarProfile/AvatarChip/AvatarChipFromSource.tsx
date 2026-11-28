import { useMemo } from 'react';
import { parseAgentSource } from '../../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import type { AvatarChipProps } from './AvatarChip';
import { AvatarChip } from './AvatarChip';

/**
 * Props of `AvatarChipFromSource`
 *
 * @public exported from `@promptbook/components`
 */
export type AvatarChipFromSourceProps = Omit<AvatarChipProps, 'avatarBasicInformation'> & {
    /**
     * Avatar to be shown
     */
    readonly source: string_book;
};

/**
 * Shows a chip with avatar's avatar and name based on the avatar source string
 *
 * This component is wrapped around the `<AvatarChip/>`, it just parses the avatar source string into `AvatarBasicInformation` and passes it to the `<AvatarChip/>` component.
 *
 * @public exported from `@promptbook/components`
 */
export function AvatarChipFromSource(props: AvatarChipFromSourceProps) {
    const { source } = props;

    const avatarBasicInformation = useMemo(() => {
        return parseAgentSource(source);
    }, [source]);

    return <AvatarChip avatarBasicInformation={avatarBasicInformation} {...props} />;
}
