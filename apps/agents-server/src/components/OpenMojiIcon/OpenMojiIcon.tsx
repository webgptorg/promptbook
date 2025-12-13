import { string_char_emoji } from '@promptbook-local/types';
import { DetailedHTMLProps, HTMLAttributes } from 'react';

type OpenMojiIconProps = DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement> & {
    /**
     * The OpenMoji character to display
     */
    icon: string_char_emoji | string;

    /**
     * @default 'black'
     */
    variant?: 'black' | 'color';
};

/**
 * Renders an emoji using the OpenMoji black and white font
 */
export function OpenMojiIcon(props: OpenMojiIconProps) {
    const { icon, variant = 'black', className, style, ...rest } = props;

    const fontFamily = variant === 'black' ? '"OpenMojiBlack", sans-serif' : '"OpenMojiColor", sans-serif';

    return (
        <span className={className} style={{ ...style, fontFamily }} {...rest}>
            {icon}
        </span>
    );
}
